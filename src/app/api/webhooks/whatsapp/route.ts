import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
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
import { askHazel } from "@/lib/ai/hazel";
import { buildGardenContext } from "@/lib/ai/context";
import { createPlant, createLog } from "@/lib/supabase/queries";
import type { WhatsAppWebhookBody } from "@/lib/types";

/**
 * Extend the max execution time for this route.
 * Image processing (WhatsApp download + Gemini vision + Cloudinary upload)
 * typically takes 8-15 seconds — well beyond the 10s default.
 * Hobby plan max: 60 seconds.
 */
export const maxDuration = 60;

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

// Acknowledgement phrases — keeps conversations feeling natural
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

  if (message.type === "image") {
    await sendTextMessage(phone, pickRandom(IMAGE_ACKS));
    // Re-fire typing indicator — sending the ack message cancels the previous one
    await markReadAndType(message.id);
  }

  try {
    let textContent = "";
    let gardenId: string;
    let conversationId: string;
    let isNew: boolean;
    const imageUrls: string[] = [];
    const rawImageData: { base64: string; mimeType: string }[] = [];
    let cloudinaryPromise: Promise<string> | null = null;

    if (message.type === "text" && message.text) {
      textContent = message.text.body;

      // Resolve user
      console.log("[HAZEL] Step 1: Resolving user (text)...");
      const resolved = await resolveWhatsAppUser(supabase, phone, profileName);
      gardenId = resolved.gardenId;
      conversationId = resolved.conversationId;
      isNew = resolved.isNew;
      console.log("[HAZEL] Step 1 done: user resolved, isNew =", isNew);

      // Send split ack for returning users with longer messages
      const isShortMessage = textContent.trim().split(/\s+/).length <= 3;
      if (!isNew && !isShortMessage) {
        await sendTextMessage(phone, pickRandom(TEXT_ACKS));
        // Re-fire typing — sending the ack cancels the previous indicator
        await markReadAndType(message.id);
      }

    } else if (message.type === "image" && message.image) {
      textContent = message.image.caption || "Sent a photo";

      // Download image + resolve user IN PARALLEL
      console.log("[HAZEL] Step 1: Downloading media + resolving user (parallel)...");
      const [mediaResult, resolved] = await Promise.all([
        downloadMedia(message.image.id),
        resolveWhatsAppUser(supabase, phone, profileName),
      ]);
      gardenId = resolved.gardenId;
      conversationId = resolved.conversationId;
      isNew = resolved.isNew;
      console.log("[HAZEL] Step 1 done: media downloaded (%d bytes, %s), user resolved", mediaResult.buffer.length, mediaResult.mimeType);

      // Keep raw buffer for Gemini
      rawImageData.push({
        base64: mediaResult.buffer.toString("base64"),
        mimeType: mediaResult.mimeType,
      });

      // Start Cloudinary upload — runs in parallel with Gemini, resolved later
      cloudinaryPromise = uploadToCloudinary(mediaResult.buffer, mediaResult.mimeType);

    } else {
      await sendTextMessage(
        phone,
        "I can read text messages and photos at the moment. Send me a picture of something growing and I will have a look!"
      );
      return;
    }

    // Build context + save user message IN PARALLEL
    console.log("[HAZEL] Step 2: Building context + saving user message (parallel)...");
    const [context] = await Promise.all([
      buildGardenContext(supabase, gardenId, conversationId),
      saveMessage(supabase, conversationId, "user", textContent, imageUrls),
    ]);
    console.log("[HAZEL] Step 2 done: context built (plants=%d, msgs=%d, isNew=%s)", context.plantCount, context.userMessageCount, context.isNewUser);

    // Ask Hazel (the main bottleneck — Gemini call)
    console.log("[HAZEL] Step 3: Asking Gemini... (images=%d, textLen=%d)", rawImageData.length, textContent.length);
    let hazelResponse;
    try {
      hazelResponse = await askHazel({
        userMessage: textContent,
        imageData: rawImageData.length > 0 ? rawImageData : undefined,
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

    // Step 4: Resolve Cloudinary upload if it was started (should be done by now)
    console.log("[HAZEL] Step 4: Resolving Cloudinary upload...");
    if (cloudinaryPromise) {
      try {
        const cloudinaryUrl = await cloudinaryPromise;
        imageUrls.push(cloudinaryUrl);
        console.log("[HAZEL] Step 4 done: Cloudinary URL =", cloudinaryUrl.substring(0, 60) + "...");
      } catch (err) {
        console.error("[HAZEL] Step 4 FAILED (Cloudinary, non-fatal):", err);
      }
    } else {
      console.log("[HAZEL] Step 4 skipped: no image to upload");
    }

    // Step 5: Save identified plants — only high-confidence IDs (85%+), max 3
    const savedPlantIds: string[] = [];
    const plantsToSave = hazelResponse.identifiedPlants.slice(0, 3);
    console.log("[HAZEL] Step 5: Saving plants (shouldSave=%s, candidates=%d)", hazelResponse.shouldSavePlants, plantsToSave.length);
    if (hazelResponse.shouldSavePlants && plantsToSave.length > 0) {
      for (const plant of plantsToSave) {
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

          if (imageUrls.length > 0) {
            await createLog(supabase, gardenId, {
              plantId: createdPlant.id,
              date: new Date().toISOString().split("T")[0],
              cloudinaryUrl: imageUrls[0],
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
    }

    // Step 6: Save Hazel's response
    try {
      await saveMessage(supabase, conversationId, "assistant", hazelResponse.text);
      console.log("[HAZEL] Step 6 done: response saved");
    } catch (stepErr) {
      console.error("[HAZEL] Step 6 FAILED (non-fatal):", String(stepErr));
    }

    // Step 7: Send plant card image(s) if plants were identified
    const plantsWereSaved = savedPlantIds.length > 0;
    if (plantsWereSaved) {
      console.log("[HAZEL] Step 7: Sending %d plant card(s)...", savedPlantIds.length);
      for (const plantId of savedPlantIds) {
        try {
          const cardUrl = `https://garden-project-theta.vercel.app/api/card/${plantId}`;
          await sendImageMessage(phone, cardUrl);
          console.log("[HAZEL] Step 7: Sent plant card for", plantId);
        } catch (cardErr) {
          console.error("[HAZEL] Step 7 FAILED (card send, non-fatal):", cardErr);
        }
      }
    } else {
      console.log("[HAZEL] Step 7 skipped: no plants saved");
    }

    // Step 8: Build and send the text reply
    let replyText = hazelResponse.text;

    // Journal reveal: when the 2nd plant is saved (plantCount was < 2 before, now >= 2)
    const plantsBeforeThisMessage = context.plantCount;
    const totalPlantsNow = plantsBeforeThisMessage + savedPlantIds.length;
    const isJournalRevealMoment = plantsBeforeThisMessage < 2 && totalPlantsNow >= 2;
    console.log("[HAZEL] Step 8: Journal reveal check — before=%d, saved=%d, total=%d, reveal=%s", plantsBeforeThisMessage, savedPlantIds.length, totalPlantsNow, isJournalRevealMoment);

    if (isJournalRevealMoment || plantsWereSaved) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("public_slug, name")
        .eq("phone", phone)
        .single();

      const gardenUrl = profile?.public_slug
        ? `https://garden-project-theta.vercel.app/g/${profile.public_slug}`
        : null;

      if (isJournalRevealMoment && gardenUrl) {
        const name = profile?.name || "lovely";
        replyText += `\n\n${name}! I made this little garden journal for you, if you like!\n${gardenUrl}`;
        console.log("[HAZEL] Step 8: Journal reveal appended for", name);
      }
    }

    console.log("[HAZEL] Step 9: Sending reply (length=%d)...", replyText.length);
    await sendTextMessage(phone, replyText);
    console.log("[HAZEL] DONE — reply sent successfully");
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error("[HAZEL] FATAL ERROR:", errMsg);

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
