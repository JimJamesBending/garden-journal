/**
 * WhatsApp Business API client
 * Handles sending messages, downloading media, and uploading to Cloudinary.
 */

import { debugLog } from "@/lib/debug-log";

const GRAPH_API = "https://graph.facebook.com/v23.0";
const CLOUDINARY_CLOUD = "davterbwx";
const CLOUDINARY_PRESET = "garden_log";

function getAccessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("Missing WHATSAPP_ACCESS_TOKEN");
  return token;
}

function getPhoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID");
  return id;
}

/**
 * Mark a message as read (blue ticks) AND show typing indicator.
 *
 * STRATEGY CHANGE: We now send read receipt and typing indicator as
 * TWO SEPARATE calls. Some evidence suggests combining them into one
 * payload can cause the typing indicator to be silently dropped.
 */
export async function markReadAndType(messageId: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;

  // Step 1: Send read receipt (blue ticks)
  try {
    const readRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
    const readBody = await readRes.text();
    console.log("[HAZEL] markRead:", readRes.status, readBody);
    debugLog("mark_read", {
      messageId,
      status: readRes.status,
      response: readBody,
    });
  } catch (e) {
    console.error("[HAZEL] markRead error:", e);
    debugLog("mark_read_error", { messageId, error: String(e) });
  }

  // Step 2: Send typing indicator SEPARATELY
  await showTyping(messageId);
}

/**
 * Show typing indicator only.
 * Sends as a dedicated call — NOT combined with read receipt.
 * Fire-and-forget: logs but never throws.
 */
export async function showTyping(messageId: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;

  // The documented format: typing_indicator on a read-receipt call
  const documentedPayload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: {
      type: "text",
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(documentedPayload),
    });
    const body = await res.text();

    if (!res.ok) {
      console.error("[HAZEL] showTyping FAILED:", res.status, body);
    } else {
      console.log("[HAZEL] showTyping OK:", res.status, body);
    }

    // Log full details to Supabase for debugging
    debugLog("show_typing", {
      messageId,
      apiVersion: "v23.0",
      status: res.status,
      response: body,
      payload: documentedPayload,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[HAZEL] showTyping error:", e);
    debugLog("show_typing_error", { messageId, error: String(e) });
  }
}

/**
 * Keeps typing indicator alive during long operations.
 * Re-fires every 20 seconds (typing expires after 25s).
 * Returns a cancel function.
 */
export function startTypingKeepalive(messageId: string): () => void {
  const interval = setInterval(() => {
    showTyping(messageId).catch(() => {});
  }, 20_000);

  return () => clearInterval(interval);
}

/**
 * Mark a message as read (blue ticks) without typing indicator.
 */
export async function markRead(messageId: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => {});
}

/**
 * Send an image message to a WhatsApp user.
 * The image must be a publicly accessible URL.
 */
export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  const imagePayload: { link: string; caption?: string } = { link: imageUrl };
  if (caption) imagePayload.caption = caption;

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: imagePayload,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp image send failed:", err);
    throw new Error(`WhatsApp image send failed: ${res.status}`);
  }
}

/**
 * Send a text message to a WhatsApp user.
 */
export async function sendTextMessage(to: string, body: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  const res = await fetch(
    `${GRAPH_API}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send failed:", err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }
}

/**
 * Download media from WhatsApp CDN.
 * Two-step: first get the media URL, then download the binary.
 */
export async function downloadMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = getAccessToken();

  // Step 1: Get media URL
  const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    throw new Error(`Failed to get media URL: ${metaRes.status}`);
  }

  const metaData = (await metaRes.json()) as {
    url: string;
    mime_type: string;
  };

  // Step 2: Download binary
  const mediaRes = await fetch(metaData.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!mediaRes.ok) {
    throw new Error(`Failed to download media: ${mediaRes.status}`);
  }

  const arrayBuffer = await mediaRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: metaData.mime_type,
  };
}

/**
 * Upload a buffer to Cloudinary using unsigned upload.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const formData = new FormData();
  formData.append("file", base64);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Cloudinary upload failed:", err);
    throw new Error(`Cloudinary upload failed: ${res.status}`);
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
