import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWhatsAppUser } from "@/lib/channels/resolve-user";
import { saveMessage } from "@/lib/channels/save-message";
import {
  sendTextMessage,
  sendImageMessage,
  markReadAndType,
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
import { createPlant, createLog } from "@/lib/supabase/queries";
import type { WhatsAppWebhookBody } from "@/lib/types";

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
 * Returns 200 immediately, processes the message asynchronously.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as WhatsAppWebhookBody;

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

          await processMessage(phone, profileName, message);
        }
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
}

// ============================================
// ACKNOWLEDGEMENT PHRASES
// ============================================

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

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================
// MESSAGE ROUTER
// ============================================

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

  // UNSUPPORTED: voice, video, document, etc.
  await sendTextMessage(
    phone,
    "I can read text messages and photos at the moment. Send me a picture of something growing and I will have a look!"
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

  // Only the first image in a batch sends the ack
  if (isFirstInBatch) {
    await sendTextMessage(phone, pickRandom(IMAGE_ACKS));
    // Re-fire typing indicator — sending the ack cancels the previous one
    await markReadAndType(messageId);
    console.log("[HAZEL] First in batch — ack sent");
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

  // We are the batch winner — process all images together
  console.log("[HAZEL] Claimed batch of %d image(s) for %s", batch.length, phone);
  await processBatchedImages(supabase, phone, profileName, batch);
}

// ============================================
// BATCHED IMAGE PROCESSING
// ============================================

async function processBatchedImages(
  supabase: SupabaseClient,
  phone: string,
  profileName: string,
  batch: PendingImage[]
): Promise<void> {
  try {
    // Step 1: Resolve user + download ALL images in parallel
    console.log("[HAZEL] Step 1: Resolving user + downloading %d image(s)...", batch.length);
    const [resolved, ...mediaResults] = await Promise.all([
      resolveWhatsAppUser(supabase, phone, profileName),
      ...batch.map((img) => downloadMedia(img.media_id)),
    ]);
    const { gardenId, conversationId } = resolved;
    console.log("[HAZEL] Step 1 done: user resolved, %d images downloaded", mediaResults.length);

    // Re-fire typing — downloads may have taken a while
    await markReadAndType(batch[0].whatsapp_message_id);

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
    console.log("[HAZEL] Step 3: Asking Gemini... (%d images, textLen=%d)", rawImageData.length, combinedCaption.length);
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
    }

    // Step 5: Resolve Cloudinary uploads
    console.log("[HAZEL] Step 4: Resolving Cloudinary uploads...");
    const cloudinaryUrls = (await Promise.all(cloudinaryPromises)).filter(Boolean) as string[];
    console.log("[HAZEL] Step 4 done: %d Cloudinary URLs", cloudinaryUrls.length);

    // Step 6: Save identified plants
    const savedPlantIds = await savePlants(
      supabase, gardenId, hazelResponse, cloudinaryUrls
    );

    // Step 7: Save Hazel's response
    try {
      await saveMessage(supabase, conversationId, "assistant", hazelResponse.text);
      console.log("[HAZEL] Step 6 done: response saved");
    } catch (stepErr) {
      console.error("[HAZEL] Step 6 FAILED (non-fatal):", String(stepErr));
    }

    // Step 8: Send plant cards + text reply
    await sendPlantCardsAndReply(
      supabase, phone, savedPlantIds, context.plantCount, hazelResponse.text
    );

    console.log("[HAZEL] DONE — batch of %d image(s) processed", batch.length);
  } catch (err) {
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
// TEXT MESSAGE PROCESSING (immediate, no batching)
// ============================================

async function processTextMessage(
  supabase: SupabaseClient,
  phone: string,
  profileName: string,
  messageId: string,
  textContent: string
): Promise<void> {
  try {
    // Step 1: Resolve user
    console.log("[HAZEL] Step 1: Resolving user (text)...");
    const resolved = await resolveWhatsAppUser(supabase, phone, profileName);
    const { gardenId, conversationId, isNew } = resolved;
    console.log("[HAZEL] Step 1 done: user resolved, isNew =", isNew);

    // Send split ack for returning users with longer messages
    const isShortMessage = textContent.trim().split(/\s+/).length <= 3;
    if (!isNew && !isShortMessage) {
      await sendTextMessage(phone, pickRandom(TEXT_ACKS));
      // Re-fire typing — sending the ack cancels the previous indicator
      await markReadAndType(messageId);
    }

    // Step 2: Build context + save user message IN PARALLEL
    console.log("[HAZEL] Step 2: Building context + saving user message (parallel)...");
    const [context] = await Promise.all([
      buildGardenContext(supabase, gardenId, conversationId),
      saveMessage(supabase, conversationId, "user", textContent),
    ]);
    console.log("[HAZEL] Step 2 done: context built (plants=%d, msgs=%d, isNew=%s)", context.plantCount, context.userMessageCount, context.isNewUser);

    // Step 3: Ask Gemini (text only — no images)
    console.log("[HAZEL] Step 3: Asking Gemini... (text only, textLen=%d)", textContent.length);
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
    }

    // Step 4: Save Hazel's response
    try {
      await saveMessage(supabase, conversationId, "assistant", hazelResponse.text);
      console.log("[HAZEL] Step 4 done: response saved");
    } catch (stepErr) {
      console.error("[HAZEL] Step 4 FAILED (non-fatal):", String(stepErr));
    }

    // Step 5: Send text reply
    console.log("[HAZEL] Step 5: Sending reply (length=%d)...", hazelResponse.text.length);
    await sendTextMessage(phone, hazelResponse.text);
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
 * Save identified plants — only high-confidence IDs (85%+), max 3.
 * Returns array of saved plant IDs.
 */
async function savePlants(
  supabase: SupabaseClient,
  gardenId: string,
  hazelResponse: { identifiedPlants: Array<{ commonName: string; latinName: string; confidence: number; category: "fruit" | "vegetable" | "herb" | "flower"; variety: string; aiNotes: string }>; shouldSavePlants: boolean },
  cloudinaryUrls: string[]
): Promise<string[]> {
  const savedPlantIds: string[] = [];
  const plantsToSave = hazelResponse.identifiedPlants.slice(0, 3);
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
 * Handles journal reveal using atomic database flag.
 */
async function sendPlantCardsAndReply(
  supabase: SupabaseClient,
  phone: string,
  savedPlantIds: string[],
  plantsBeforeThisMessage: number,
  hazelText: string
): Promise<void> {
  const plantsWereSaved = savedPlantIds.length > 0;

  // Send plant card images
  if (plantsWereSaved) {
    console.log("[HAZEL] Step 7: Sending %d plant card(s)...", savedPlantIds.length);
    for (const plantId of savedPlantIds) {
      try {
        const cardUrl = `https://garden-project-theta.vercel.app/api/card/${plantId}`;
        await sendImageMessage(phone, cardUrl);
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
        const gardenUrl = `https://garden-project-theta.vercel.app/g/${profile.public_slug}`;
        const name = profile?.name || "lovely";
        replyText += `\n\n${name}! I made this little garden journal for you, if you like!\n${gardenUrl}`;
        console.log("[HAZEL] Journal reveal appended for", name);
      }
    } else {
      console.log("[HAZEL] Journal reveal already claimed (skipping)");
    }
  }

  // Send the reply
  console.log("[HAZEL] Step 8: Sending reply (length=%d)...", replyText.length);
  await sendTextMessage(phone, replyText);
}
