import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { resolveWhatsAppUser } from "@/lib/channels/resolve-user";
import { saveMessage } from "@/lib/channels/save-message";
import {
  sendTextMessage,
  sendImageMessage,
  markReadAndType,
  markRead,
  startTypingKeepalive,
  downloadMedia,
  uploadToCloudinary,
} from "@/lib/channels/whatsapp";
import {
  enqueuePendingImage,
  waitAndClaimBatch,
} from "@/lib/channels/image-batcher";
import type { PendingImage } from "@/lib/channels/image-batcher";
import { askHazel } from "@/lib/ai/hazel";
import { buildGardenContext } from "@/lib/ai/context";
import { createPlant, createLog, getSpaces, createSpace, updateSpace } from "@/lib/supabase/queries";
import type { WhatsAppWebhookBody, SpaceType, SpaceSubtype } from "@/lib/types";
import { SPACE_HIERARCHY, SUBTYPE_INFO } from "@/lib/types";
import { debugLog } from "@/lib/debug-log";

/** Base URL for plant cards and garden journal links */
const APP_URL = process.env.APP_URL || "https://garden-project-theta.vercel.app";

/**
 * Extend the max execution time for this route.
 * Image processing (WhatsApp download + Gemini vision + Cloudinary upload)
 * typically takes 8-15 seconds — well beyond the 10s default.
 * With batching, a single invocation may wait up to 8s + 15s processing.
 * Hobby plan max: 60 seconds.
 */
export const maxDuration = 60;

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification — Meta sends a challenge to confirm the endpoint.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp messages.
 * Verifies signature, returns 200 immediately, processes asynchronously.
 */
export async function POST(req: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify webhook signature (if app secret is configured)
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
      console.error("[HAZEL] Webhook signature verification failed");
      debugLog("webhook_signature_failed", {
        hasSignature: !!signature,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as WhatsAppWebhookBody;

  // Return 200 immediately — Meta requires fast response
  // Process the message asynchronously via waitUntil
  waitUntil(processWebhook(body));

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// ============================================
// WEBHOOK PROCESSING
// ============================================

async function processWebhook(body: WhatsAppWebhookBody): Promise<void> {
  try {
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        if (!value.messages || value.messages.length === 0) continue;

        for (const message of value.messages) {
          const phone = message.from;
          const profileName =
            value.contacts?.[0]?.profile?.name || "Gardener";

          // Idempotency: skip duplicate webhook deliveries
          const supabaseCheck = createAdminClient();
          const { data: existingMsg } = await supabaseCheck
            .from("messages")
            .select("id")
            .eq("metadata->>whatsapp_message_id", message.id)
            .limit(1)
            .maybeSingle();

          if (existingMsg) {
            console.log("[HAZEL] Duplicate webhook skipped:", message.id);
            debugLog("webhook_duplicate", { messageId: message.id });
            continue;
          }

          // Log every incoming message for debugging
          debugLog("webhook_message", {
            messageId: message.id,
            type: message.type,
            from: phone,
            profileName,
            timestamp: message.timestamp,
            hasText: !!message.text,
            hasImage: !!message.image,
          });

          await processMessage(phone, profileName, message);
        }
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    debugLog("webhook_error", { error: String(err) });
  }
}

// ============================================
// ACKNOWLEDGEMENT PHRASES
// ============================================

/**
 * Ack phrases — these are PREPENDED to Hazel's actual response so the
 * final message reads as one cohesive reply: "Let me put my glasses on... A Jasmine!"
 *
 * WHY: WhatsApp typing indicator only works ONCE per inbound message,
 * BEFORE you send any reply. If we send a separate ack, typing dies and
 * the user sees dead silence while Gemini processes. By merging the ack
 * into the response, typing runs the entire time, and the response feels
 * natural — like Hazel looked, then spoke.
 */
const IMAGE_ACKS = [
  "Let me put my glasses on...",
  "Ooh let me have a look...",
  "Hold on, let me clean my glasses...",
  "Where did I put my glasses...",
  "Let me get a closer look...",
  "One sec, just finding my glasses...",
];

const TEXT_ACKS = [
  "Hmmm...",
  "Let me think...",
  "One moment...",
  "Hmm hang on...",
];

/**
 * Progress messages — sent ONLY if processing takes longer than 15 seconds.
 * Once sent, typing indicator is dead for this conversation turn, but
 * at least the user knows Hazel is still working.
 */
const PROGRESS_MESSAGES = [
  "Nearly there...",
  "Just checking my books...",
  "Hmm, this is an interesting one...",
  "Bear with me...",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================
// MESSAGE ROUTER
// ============================================

// Message types that should be silently blue-ticked with NO reply.
// These are conversational fluff that shouldn't interrupt ongoing processing.
const SILENT_TYPES = ["sticker", "reaction", "location", "contacts", "interactive", "order", "system"];

async function processMessage(
  phone: string,
  profileName: string,
  message: {
    id: string;
    type: string;
    text?: { body: string };
    image?: { id: string; mime_type: string; caption?: string };
  }
): Promise<void> {
  // SILENT: stickers, reactions, location, etc. — blue-tick only, no reply
  if (SILENT_TYPES.includes(message.type)) {
    await markRead(message.id);
    return;
  }

  const supabase = createAdminClient();

  // Send read receipt + typing indicator IMMEDIATELY — before any DB work
  await markReadAndType(message.id);

  if (message.type === "image" && message.image) {
    // IMAGE PATH: enqueue into batch queue, wait, claim or exit
    await processImageMessage(supabase, phone, profileName, message.id, message.image);
    return;
  }

  if (message.type === "text" && message.text) {
    // TEXT PATH: process immediately (no batching)
    await processTextMessage(supabase, phone, profileName, message.id, message.text.body);
    return;
  }

  // UNSUPPORTED MEDIA: audio, video, document — short in-character reply
  await sendTextMessage(
    phone,
    "I can only look at photos for now — send me a snap of what's growing! 🌱"
  );
}

// ============================================
// IMAGE PATH (batch queue)
// ============================================

async function processImageMessage(
  supabase: SupabaseClient,
  phone: string,
  profileName: string,
  messageId: string,
  image: { id: string; mime_type: string; caption?: string }
): Promise<void> {
  // Phase 1: Enqueue into batch queue
  console.log("[HAZEL] Image received from %s, enqueueing...", phone);
  const { isFirstInBatch } = await enqueuePendingImage(
    supabase, phone, profileName, messageId,
    image.id, image.mime_type, image.caption || ""
  );

  if (isFirstInBatch) {
    // Pick an ack phrase NOW — we'll prepend it to the final response later.
    // No separate ack message — typing indicator runs the whole time.
    console.log("[HAZEL] First in batch — typing running, ack will merge into response");
  } else {
    console.log("[HAZEL] Not first in batch — skipping ack");
  }

  // Phase 2: Wait for batch window, then try to claim
  const batch = await waitAndClaimBatch(supabase, phone);

  if (!batch) {
    // Another invocation is processing this batch — exit silently
    console.log("[HAZEL] Batch already claimed by another invocation for %s", phone);
    return;
  }

  // Typing indicator is still alive (no outbound messages sent yet).
  // The keepalive inside processBatchedImages will maintain it.
  console.log("[HAZEL] Claimed batch of %d image(s) for %s", batch.length, phone);
  await processBatchedImages(supabase, phone, profileName, batch, messageId);
}

// ============================================
// BATCHED IMAGE PROCESSING
// ============================================

async function processBatchedImages(
  supabase: SupabaseClient,
  phone: string,
  profileName: string,
  batch: PendingImage[],
  replyToMessageId?: string
): Promise<void> {
  const processingStartedAt = new Date();
  const batchMsgId = batch[0].whatsapp_message_id;
  // Pick ack phrase now — will be prepended to the final response
  const ackPhrase = pickRandom(IMAGE_ACKS);
  let progressSent = false;

  // Progress timeout: if processing takes >15s, send a progress message
  // so the user knows Hazel is still working. After this, typing dies
  // (API limitation) but at least there's visible activity.
  const progressTimer = setTimeout(async () => {
    try {
      await sendTextMessage(phone, pickRandom(PROGRESS_MESSAGES), replyToMessageId);
      progressSent = true;
      console.log("[HAZEL] Sent progress message (>15s processing)");
    } catch {
      // Non-fatal
    }
  }, 15_000);

  try {
    // Step 1: Resolve user + download ALL images in parallel
    console.log("[HAZEL] Step 1: Resolving user + downloading %d image(s)...", batch.length);
    const [resolved, ...mediaResults] = await Promise.all([
      resolveWhatsAppUser(supabase, phone, profileName),
      ...batch.map((img) => downloadMedia(img.media_id)),
    ]);
    const { gardenId, conversationId } = resolved;
    console.log("[HAZEL] Step 1 done: user resolved, %d images downloaded", mediaResults.length);

    // Step 2: Prepare image data for Gemini + start Cloudinary uploads
    const rawImageData = mediaResults.map((r) => ({
      base64: r.buffer.toString("base64"),
      mimeType: r.mimeType,
    }));

    const cloudinaryPromises = mediaResults.map((r) =>
      uploadToCloudinary(r.buffer, r.mimeType).catch((err) => {
        console.error("[HAZEL] Cloudinary upload failed (non-fatal):", err);
        return null;
      })
    );

    // Combine captions from all images
    const combinedCaption = batch
      .map((img) => img.caption)
      .filter(Boolean)
      .join(". ") || "Sent a photo";

    // Step 3: Build context + save user message IN PARALLEL
    console.log("[HAZEL] Step 2: Building context + saving user message...");
    const [context] = await Promise.all([
      buildGardenContext(supabase, gardenId, conversationId),
      saveMessage(supabase, conversationId, "user", combinedCaption),
    ]);
    console.log("[HAZEL] Step 2 done: context built (plants=%d, isNew=%s)", context.plantCount, context.isNewUser);

    // Step 4: ONE Gemini call with ALL images
    // Typing keepalive runs before any outbound message — so it actually works!
    console.log("[HAZEL] Step 3: Asking Gemini... (%d images, textLen=%d)", rawImageData.length, combinedCaption.length);
    const stopTyping = startTypingKeepalive(batchMsgId);
    let hazelResponse;
    try {
      hazelResponse = await askHazel({
        userMessage: combinedCaption,
        imageData: rawImageData,
        gardenContext: context,
      });
      console.log("[HAZEL] Step 3 done: Gemini responded (textLen=%d, plants=%d, shouldSave=%s)",
        hazelResponse.text.length,
        hazelResponse.identifiedPlants.length,
        hazelResponse.shouldSavePlants
      );
    } catch (stepErr) {
      console.error("[HAZEL] Step 3 FAILED (Gemini):", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    } finally {
      stopTyping();
    }

    // Step 5: Resolve Cloudinary uploads
    console.log("[HAZEL] Step 4: Resolving Cloudinary uploads...");
    const cloudinaryUrls = (await Promise.all(cloudinaryPromises)).filter(Boolean) as string[];
    console.log("[HAZEL] Step 4 done: %d Cloudinary URLs", cloudinaryUrls.length);

    // Step 6: Save identified plants
    const savedPlantIds = await savePlants(
      supabase, gardenId, hazelResponse, cloudinaryUrls
    );

    // Step 6b: Auto-create space if Hazel detected one
    if (hazelResponse.detectedSpace && savedPlantIds.length > 0) {
      try {
        await assignPlantsToSpace(
          supabase, gardenId, hazelResponse.detectedSpace, savedPlantIds,
          hazelResponse.detectedSubtype
        );
      } catch (spaceErr) {
        console.error("[HAZEL] Space assignment failed (non-fatal):", spaceErr);
      }
    }

    // Step 7: Check for interrupts — did new text messages arrive during processing?
    // Don't re-ask Gemini — plant ID is already done. The text messages will be
    // processed by their own invocations. Just log and continue with the original response.
    const interruptContent = await checkForInterrupt(supabase, conversationId, processingStartedAt);
    if (interruptContent) {
      console.log("[HAZEL] Interrupt detected during image processing (ignored — plant ID already done)");
    }

    // Cancel progress timer — we're about to send the real response
    clearTimeout(progressTimer);

    // Step 8: Merge ack phrase into Hazel's response
    // "Let me put my glasses on... A Jasmine! I'll add this to the balcony."
    // Skip ack prefix for new users (golden path message 1/2 should stand alone)
    // and if a progress message was already sent (avoid double-preamble)
    const mergedText = (!context.isNewUser && !progressSent)
      ? `${ackPhrase} ${hazelResponse.text}`
      : hazelResponse.text;

    // Step 9: Save Hazel's response
    try {
      await saveMessage(supabase, conversationId, "assistant", mergedText);
      console.log("[HAZEL] Response saved");
    } catch (stepErr) {
      console.error("[HAZEL] Save response FAILED (non-fatal):", String(stepErr));
    }

    // Step 10: Send plant cards + text reply (as replies to original image)
    await sendPlantCardsAndReply(
      supabase, phone, savedPlantIds, context.plantCount, mergedText,
      replyToMessageId || batchMsgId
    );

    console.log("[HAZEL] DONE — batch of %d image(s) processed", batch.length);
  } catch (err) {
    clearTimeout(progressTimer);
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error("[HAZEL] FATAL ERROR (batch):", errMsg);

    try {
      await sendTextMessage(
        phone,
        "Sorry, I got a bit tangled up there. Could you try sending that again in a moment?"
      );
    } catch {
      console.error("[HAZEL] Failed to send error message");
    }
  }
}

// ============================================
// INTERRUPT DETECTION
// ============================================

/**
 * Check if new user messages arrived during processing.
 * Queries messages in this conversation newer than the processing start time.
 * Returns the new messages content if interrupted, or null.
 */
async function checkForInterrupt(
  supabase: SupabaseClient,
  conversationId: string,
  processingStartedAt: Date
): Promise<string | null> {
  const { data: newMessages } = await supabase
    .from("messages")
    .select("content, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "user")
    .gt("created_at", processingStartedAt.toISOString())
    .order("created_at", { ascending: true });

  if (!newMessages || newMessages.length === 0) return null;

  console.log("[HAZEL] INTERRUPT detected: %d new message(s) during processing", newMessages.length);
  debugLog("interrupt_detected", {
    conversationId,
    newMessageCount: newMessages.length,
    processingStartedAt: processingStartedAt.toISOString(),
  });

  return newMessages.map((m) => m.content).join("\n");
}

// ============================================
// TEXT MESSAGE PROCESSING (immediate, no batching)
// ============================================

async function processTextMessage(
  supabase: SupabaseClient,
  phone: string,
  profileName: string,
  messageId: string,
  textContent: string
): Promise<void> {
  const processingStartedAt = new Date();
  try {
    // Step 1: Resolve user
    console.log("[HAZEL] Step 1: Resolving user (text)...");
    const resolved = await resolveWhatsAppUser(supabase, phone, profileName);
    const { gardenId, conversationId, isNew } = resolved;
    console.log("[HAZEL] Step 1 done: user resolved, isNew =", isNew);

    // No separate ack message — typing indicator runs from markReadAndType()
    // and stays alive via keepalive until we send our first (and only) reply.

    // Step 2: Build context + save user message IN PARALLEL
    console.log("[HAZEL] Step 2: Building context + saving user message (parallel)...");
    const [context] = await Promise.all([
      buildGardenContext(supabase, gardenId, conversationId),
      saveMessage(supabase, conversationId, "user", textContent),
    ]);
    console.log("[HAZEL] Step 2 done: context built (plants=%d, msgs=%d, isNew=%s)", context.plantCount, context.userMessageCount, context.isNewUser);

    // Step 3: Ask Gemini (text only — no images)
    // Typing keepalive: works because no outbound message has been sent yet
    console.log("[HAZEL] Step 3: Asking Gemini... (text only, textLen=%d)", textContent.length);
    const stopTyping = startTypingKeepalive(messageId);
    let hazelResponse;
    try {
      hazelResponse = await askHazel({
        userMessage: textContent,
        gardenContext: context,
      });
      console.log("[HAZEL] Step 3 done: Gemini responded (textLen=%d)", hazelResponse.text.length);
    } catch (stepErr) {
      console.error("[HAZEL] Step 3 FAILED (Gemini):", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    } finally {
      stopTyping();
    }

    // Step 4: Check for interrupts — did new messages arrive during processing?
    // Don't re-ask Gemini — the new messages will get their own invocations.
    // Just log and continue with the original response.
    const interruptContent = await checkForInterrupt(supabase, conversationId, processingStartedAt);
    if (interruptContent) {
      console.log("[HAZEL] Interrupt detected during text processing (ignored — response already generated)");
    }

    // Step 5: Save Hazel's response
    try {
      await saveMessage(supabase, conversationId, "assistant", hazelResponse.text);
      console.log("[HAZEL] Response saved");
    } catch (stepErr) {
      console.error("[HAZEL] Save response FAILED (non-fatal):", String(stepErr));
    }

    // Step 6: Send text reply (as a reply to the user's original message)
    console.log("[HAZEL] Sending reply (length=%d)...", hazelResponse.text.length);
    await sendTextMessage(phone, hazelResponse.text, messageId);
    console.log("[HAZEL] DONE — text reply sent");
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error("[HAZEL] FATAL ERROR (text):", errMsg);

    try {
      await sendTextMessage(
        phone,
        "Sorry, I got a bit tangled up there. Could you try sending that again in a moment?"
      );
    } catch {
      console.error("[HAZEL] Failed to send error message");
    }
  }
}

// ============================================
// SHARED HELPERS
// ============================================

/**
 * Save identified plants — only high-confidence IDs (85%+), max 20.
 * Returns array of saved plant IDs.
 */
async function savePlants(
  supabase: SupabaseClient,
  gardenId: string,
  hazelResponse: { identifiedPlants: Array<{ commonName: string; latinName: string; confidence: number; category: "fruit" | "vegetable" | "herb" | "flower"; variety: string; aiNotes: string }>; shouldSavePlants: boolean },
  cloudinaryUrls: string[]
): Promise<string[]> {
  const savedPlantIds: string[] = [];
  const plantsToSave = hazelResponse.identifiedPlants.slice(0, 20);
  console.log("[HAZEL] Step 5: Saving plants (shouldSave=%s, candidates=%d)", hazelResponse.shouldSavePlants, plantsToSave.length);

  if (!hazelResponse.shouldSavePlants || plantsToSave.length === 0) {
    return savedPlantIds;
  }

  for (let i = 0; i < plantsToSave.length; i++) {
    const plant = plantsToSave[i];
    // Skip low-confidence guesses — don't pollute the garden with wrong IDs
    if (plant.confidence < 85) {
      console.log("[HAZEL] Skipping low-confidence plant:", plant.commonName, plant.confidence);
      continue;
    }
    try {
      const createdPlant = await createPlant(supabase, gardenId, {
        commonName: plant.commonName,
        latinName: plant.latinName,
        category: plant.category,
        variety: plant.variety || "Unknown variety",
        confidence: plant.confidence >= 90 ? "confirmed" : "partial",
        sowDate: new Date().toISOString().split("T")[0],
        location: "outdoor",
        notes: plant.aiNotes,
      });
      savedPlantIds.push(createdPlant.id);
      console.log("[HAZEL] Saved plant:", plant.commonName, "id =", createdPlant.id);

      // Use corresponding Cloudinary URL if available
      const imageUrl = cloudinaryUrls[i] || cloudinaryUrls[0] || "";
      if (imageUrl) {
        await createLog(supabase, gardenId, {
          plantId: createdPlant.id,
          date: new Date().toISOString().split("T")[0],
          cloudinaryUrl: imageUrl,
          caption: `Identified by Hazel: ${plant.commonName}`,
          status: "sowed",
          labeled: true,
        });
        console.log("[HAZEL] Created log entry for plant:", plant.commonName);
      }
    } catch (plantErr) {
      console.error("[HAZEL] Error saving plant:", plantErr);
    }
  }

  return savedPlantIds;
}

/**
 * Send plant card images and the text reply.
 * All responses are sent as replies to the user's original message (keeps things tidy).
 * Handles journal reveal using atomic database flag.
 */
async function sendPlantCardsAndReply(
  supabase: SupabaseClient,
  phone: string,
  savedPlantIds: string[],
  plantsBeforeThisMessage: number,
  hazelText: string,
  replyToMessageId?: string
): Promise<void> {
  const plantsWereSaved = savedPlantIds.length > 0;

  // Send plant card images (as replies to the user's message)
  if (plantsWereSaved) {
    console.log("[HAZEL] Step 7: Sending %d plant card(s)...", savedPlantIds.length);
    for (const plantId of savedPlantIds) {
      try {
        const cardUrl = `${APP_URL}/api/card/${plantId}`;
        await sendImageMessage(phone, cardUrl, undefined, replyToMessageId);
        console.log("[HAZEL] Sent plant card for", plantId);
      } catch (cardErr) {
        console.error("[HAZEL] Card send failed (non-fatal):", cardErr);
      }
    }
  }

  // Build reply text
  let replyText = hazelText;

  // Journal reveal: use atomic flag to prevent duplicates
  const totalPlantsNow = plantsBeforeThisMessage + savedPlantIds.length;
  if (plantsBeforeThisMessage < 2 && totalPlantsNow >= 2) {
    // Atomically try to claim the journal reveal — only first caller wins
    const { data: revealed } = await supabase.rpc("try_reveal_journal", {
      profile_phone: phone,
    });

    if (revealed === true) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("public_slug, name")
        .eq("phone", phone)
        .single();

      if (profile?.public_slug) {
        const gardenUrl = `${APP_URL}/g/${profile.public_slug}`;
        const name = profile?.name || "lovely";
        replyText += `\n\n${name}! I made this little garden journal for you, if you like!\n${gardenUrl}`;
        console.log("[HAZEL] Journal reveal appended for", name);
      }
    } else {
      console.log("[HAZEL] Journal reveal already claimed (skipping)");
    }
  }

  // Send the reply (as a reply to the user's original message)
  console.log("[HAZEL] Step 8: Sending reply (length=%d)...", replyText.length);
  await sendTextMessage(phone, replyText, replyToMessageId);
}

/**
 * Auto-create or find a space and assign plants to it.
 * If a space of the detected type already exists, add plants to it.
 * If not, create a new one with a human-readable name.
 */
async function assignPlantsToSpace(
  supabase: SupabaseClient,
  gardenId: string,
  spaceType: SpaceType,
  plantIds: string[],
  subtype?: SpaceSubtype | null
): Promise<void> {
  const spaceInfo = SPACE_HIERARCHY[spaceType];
  const spaceName = spaceInfo?.label || spaceType;

  // Check if a space of this type already exists
  const existingSpaces = await getSpaces(supabase, gardenId);
  let space = existingSpaces.find((s) => s.type === spaceType);

  if (!space) {
    // Create a new space
    space = await createSpace(supabase, gardenId, {
      name: spaceName,
      type: spaceType,
      description: "",
    });
    console.log("[HAZEL] Created space:", space.name, "type:", spaceType);
  }

  // Add plants to the space's positions (simple grid layout)
  const existingPositions = space.plantPositions || [];
  const existingPlantIds = new Set(existingPositions.map((p) => p.plantId));

  const newPositions = [...existingPositions];
  for (const plantId of plantIds) {
    if (!existingPlantIds.has(plantId)) {
      // Place new plants in a simple grid
      const idx = newPositions.length;
      newPositions.push({
        plantId,
        x: 20 + (idx % 4) * 20,
        y: 20 + Math.floor(idx / 4) * 20,
        subtype: subtype || undefined,
        label: subtype ? SUBTYPE_INFO[subtype]?.label : undefined,
      });
    }
  }

  if (newPositions.length > existingPositions.length) {
    await updateSpace(supabase, space.id, {
      plantPositions: newPositions,
    });
    console.log("[HAZEL] Assigned %d plant(s) to space: %s (subtype: %s)",
      newPositions.length - existingPositions.length, space.name, subtype || "none");
  }
}
