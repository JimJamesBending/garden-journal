import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWhatsAppUser } from "@/lib/channels/resolve-user";
import { saveMessage } from "@/lib/channels/save-message";
import {
  sendTextMessage,
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

  console.log("Webhook verify attempt:", { mode, token, verifyToken, challenge, match: token === verifyToken });

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
    type: string;
    text?: { body: string };
    image?: { id: string; mime_type: string; caption?: string };
  }
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // 1. Resolve user (find or create)
    const { gardenId, conversationId, isNew } =
      await resolveWhatsAppUser(supabase, phone, profileName);

    // 2. Extract text and media
    let textContent = "";
    const imageUrls: string[] = [];

    if (message.type === "text" && message.text) {
      textContent = message.text.body;
    } else if (message.type === "image" && message.image) {
      textContent = message.image.caption || "Sent a photo";

      // Download from Meta CDN and upload to Cloudinary
      const { buffer, mimeType } = await downloadMedia(message.image.id);
      const cloudinaryUrl = await uploadToCloudinary(buffer, mimeType);
      imageUrls.push(cloudinaryUrl);
    } else {
      // Unsupported message type
      await sendTextMessage(
        phone,
        "I can read text messages and photos at the moment. Send me a picture of something growing and I will have a look!"
      );
      return;
    }

    // 3. Save user message
    await saveMessage(supabase, conversationId, "user", textContent, imageUrls);

    // 4. Build garden context
    const context = await buildGardenContext(supabase, gardenId, conversationId);

    // 5. Ask Hazel
    const hazelResponse = await askHazel({
      userMessage: textContent,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      gardenContext: context,
    });

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

          // If there's an image, create a log entry for it
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
          console.error("Error saving plant:", plantErr);
        }
      }
    }

    // 7. Save Hazel's response
    await saveMessage(supabase, conversationId, "assistant", hazelResponse.text);

    // 8. Build the reply
    let replyText = hazelResponse.text;

    // For new users, append garden page URL
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
    await sendTextMessage(phone, replyText);
  } catch (err) {
    console.error("Error processing message:", err);

    // Send a friendly error message
    try {
      await sendTextMessage(
        phone,
        "Sorry, I got a bit tangled up there. Could you try sending that again in a moment?"
      );
    } catch {
      console.error("Failed to send error message");
    }
  }
}
