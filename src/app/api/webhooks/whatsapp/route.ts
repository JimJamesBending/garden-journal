import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWhatsAppUser } from "@/lib/channels/resolve-user";
import { saveMessage } from "@/lib/channels/save-message";
import {
  sendTextMessage,
  markTyping,
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

  // Send read receipt immediately so user sees blue ticks
  await markTyping(phone, message.id);

  try {
    // 1. Resolve user (find or create)
    console.log("[HAZEL] Step 1: Resolving user", phone, profileName);
    let gardenId: string;
    let conversationId: string;
    let isNew: boolean;
    try {
      const resolved = await resolveWhatsAppUser(supabase, phone, profileName);
      gardenId = resolved.gardenId;
      conversationId = resolved.conversationId;
      isNew = resolved.isNew;
      console.log("[HAZEL] Step 1 done:", { gardenId, conversationId, isNew });
    } catch (stepErr) {
      console.error("[HAZEL] Step 1 FAILED:", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    }

    // 2. Extract text and media
    let textContent = "";
    const imageUrls: string[] = [];

    if (message.type === "text" && message.text) {
      textContent = message.text.body;
    } else if (message.type === "image" && message.image) {
      textContent = message.image.caption || "Sent a photo";

      try {
        const { buffer, mimeType } = await downloadMedia(message.image.id);
        const cloudinaryUrl = await uploadToCloudinary(buffer, mimeType);
        imageUrls.push(cloudinaryUrl);
      } catch (mediaErr) {
        console.error("[HAZEL] Step 2 media FAILED:", mediaErr instanceof Error ? mediaErr.message : String(mediaErr));
        throw mediaErr;
      }
    } else {
      await sendTextMessage(
        phone,
        "I can read text messages and photos at the moment. Send me a picture of something growing and I will have a look!"
      );
      return;
    }
    console.log("[HAZEL] Step 2 done: text =", textContent);

    // 3. Save user message
    try {
      await saveMessage(supabase, conversationId, "user", textContent, imageUrls);
      console.log("[HAZEL] Step 3 done: message saved");
    } catch (stepErr) {
      console.error("[HAZEL] Step 3 FAILED:", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    }

    // 4. Build garden context
    let context;
    try {
      context = await buildGardenContext(supabase, gardenId, conversationId);
      console.log("[HAZEL] Step 4 done: plantCount =", context.plantCount, "isNew =", context.isNewUser);
    } catch (stepErr) {
      console.error("[HAZEL] Step 4 FAILED:", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    }

    // 5. Ask Hazel
    console.log("[HAZEL] Step 5: Asking Gemini...");
    let hazelResponse;
    try {
      hazelResponse = await askHazel({
        userMessage: textContent,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        gardenContext: context,
      });
      console.log("[HAZEL] Step 5 done: length =", hazelResponse.text.length);
    } catch (stepErr) {
      console.error("[HAZEL] Step 5 FAILED:", stepErr instanceof Error ? stepErr.message + "\n" + stepErr.stack : String(stepErr));
      throw stepErr;
    }

    // 6. Save identified plants
    if (hazelResponse.shouldSavePlants && hazelResponse.identifiedPlants.length > 0) {
      for (const plant of hazelResponse.identifiedPlants) {
        try {
          const createdPlant = await createPlant(supabase, gardenId, {
            commonName: plant.commonName,
            latinName: plant.latinName,
            category: plant.category,
            variety: plant.variety || "Unknown variety",
            confidence: plant.confidence >= 70 ? "confirmed" : "partial",
            sowDate: new Date().toISOString().split("T")[0],
            location: "outdoor",
            notes: plant.aiNotes,
          });

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

    // 8. Build the reply
    let replyText = hazelResponse.text;

    if (isNew) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("public_slug")
        .eq("phone", phone)
        .single();

      if (profile?.public_slug) {
        const gardenUrl = `https://garden-project-theta.vercel.app/g/${profile.public_slug}`;
        replyText += `\n\nYour garden page is ready: ${gardenUrl}`;
      }
    }

    // 9. Send reply via WhatsApp
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
