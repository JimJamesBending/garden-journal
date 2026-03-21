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
      const resolved = await resolveWhatsAppUser(supabase, phone, profileName);
      gardenId = resolved.gardenId;
      conversationId = resolved.conversationId;
      isNew = resolved.isNew;

      // Send split ack for returning users with longer messages
      const isShortMessage = textContent.trim().split(/\s+/).length <= 3;
      if (!isNew && !isShortMessage) {
        await sendTextMessage(phone, pickRandom(TEXT_ACKS));
      }

    } else if (message.type === "image" && message.image) {
      textContent = message.image.caption || "Sent a photo";

      // Download image + resolve user IN PARALLEL
      const [mediaResult, resolved] = await Promise.all([
        downloadMedia(message.image.id),
        resolveWhatsAppUser(supabase, phone, profileName),
      ]);
      gardenId = resolved.gardenId;
      conversationId = resolved.conversationId;
      isNew = resolved.isNew;

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
    const [context] = await Promise.all([
      buildGardenContext(supabase, gardenId, conversationId),
      saveMessage(supabase, conversationId, "user", textContent, imageUrls),
    ]);

    // Ask Hazel (the main bottleneck — Gemini call)
    console.log("[HAZEL] Asking Gemini...");
    let hazelResponse;
    try {
      hazelResponse = await askHazel({
        userMessage: textContent,
        imageData: rawImageData.length > 0 ? rawImageData : undefined,
        gardenContext: context,
      });
      console.log("[HAZEL] Gemini done: length =", hazelResponse.text.length);
    } catch (stepErr) {
      console.error("[HAZEL] Gemini FAILED:", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    }

    // Resolve Cloudinary upload if it was started (should be done by now)
    if (cloudinaryPromise) {
      try {
        const cloudinaryUrl = await cloudinaryPromise;
        imageUrls.push(cloudinaryUrl);
      } catch (err) {
        console.error("[HAZEL] Cloudinary upload failed:", err);
      }
    }

    // 6. Save identified plants — only high-confidence IDs (85%+), max 3
    const savedPlantIds: string[] = [];
    const plantsToSave = hazelResponse.identifiedPlants.slice(0, 3);
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

          if (imageUrls.length > 0) {
            await createLog(supabase, gardenId, {
              plantId: createdPlant.id,
              date: new Date().toISOString().split("T")[0],
              cloudinaryUrl: imageUrls[0],
              caption: `Identified by Hazel: ${plant.commonName}`,
              status: "sowed",
              labeled: true,
            });
          }
        } catch (plantErr) {
          console.error("[HAZEL] Error saving plant:", plantErr);
        }
      }
    }

    // 7. Save Hazel's response
    try {
      await saveMessage(supabase, conversationId, "assistant", hazelResponse.text);
      console.log("[HAZEL] Step 7 done: response saved");
    } catch (stepErr) {
      console.error("[HAZEL] Step 7 FAILED (non-fatal):", String(stepErr));
    }

    // 8. Send plant card image(s) if plants were identified
    const plantsWereSaved = savedPlantIds.length > 0;
    if (plantsWereSaved) {
      for (const plantId of savedPlantIds) {
        try {
          const cardUrl = `https://garden-project-theta.vercel.app/api/card/${plantId}`;
          await sendImageMessage(phone, cardUrl);
          console.log("[HAZEL] Sent plant card for", plantId);
        } catch (cardErr) {
          console.error("[HAZEL] Failed to send plant card:", cardErr);
        }
      }
    }

    // 9. Build and send the text reply
    let replyText = hazelResponse.text;

    // Count user messages to trigger journal reveal on the 3rd
    const { count: userMessageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("role", "user");

    const { data: profile } = await supabase
      .from("profiles")
      .select("public_slug, name")
      .eq("phone", phone)
      .single();

    const gardenUrl = profile?.public_slug
      ? `https://garden-project-theta.vercel.app/g/${profile.public_slug}`
      : null;

    // 3rd message: journal reveal moment — only once
    if (userMessageCount === 3 && gardenUrl) {
      const name = profile?.name || "lovely";
      replyText += `\n\n${name}! I've been putting together a little garden journal for you. Have a look — if you like it I'll keep it going!\n${gardenUrl}`;
    }

    console.log("[HAZEL] Step 9: Sending reply, length =", replyText.length);
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
