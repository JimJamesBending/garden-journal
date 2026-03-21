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
 * Show typing indicator.
 *
 * IMPORTANT: WhatsApp typing indicator ONLY works ONCE per inbound message,
 * BEFORE you send any reply. After any outbound message, the API returns
 * 200 OK but silently ignores the typing request. This is an undocumented
 * limitation confirmed via extensive testing and community research.
 *
 * Therefore: call this ONLY before sending your first reply. Do not call
 * it between outbound messages — it will appear to succeed but do nothing.
 *
 * Fire-and-forget: logs but never throws.
 */
export async function showTyping(messageId: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();

    if (!res.ok) {
      console.error("[HAZEL] showTyping FAILED:", res.status, body);
    } else {
      console.log("[HAZEL] showTyping OK:", res.status, body);
    }

    debugLog("show_typing", {
      messageId,
      apiVersion: "v23.0",
      status: res.status,
      ok: res.ok,
      response: body,
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
 * Only works BEFORE any outbound message has been sent.
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
 * Optionally reply to a specific message by passing `replyToMessageId`.
 */
export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string,
  replyToMessageId?: string
): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  const imagePayload: { link: string; caption?: string } = { link: imageUrl };
  if (caption) imagePayload.caption = caption;

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: imagePayload,
  };

  // If replying to a specific message, add context
  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp image send failed:", err);
    throw new Error(`WhatsApp image send failed: ${res.status}`);
  }
}

/**
 * Send a text message to a WhatsApp user.
 * Optionally reply to a specific message by passing `replyToMessageId`.
 * Returns the outbound message wamid (useful for typing indicator chaining).
 */
export async function sendTextMessage(
  to: string,
  body: string,
  replyToMessageId?: string
): Promise<string | null> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  // Enable link preview when the message contains a URL
  const hasUrl = /https?:\/\//.test(body);
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body, ...(hasUrl && { preview_url: true }) },
  };

  // If replying to a specific message, add context
  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const res = await fetch(
    `${GRAPH_API}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send failed:", err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }

  // Extract outbound wamid from response
  try {
    const data = await res.json() as { messages?: Array<{ id: string }> };
    return data.messages?.[0]?.id || null;
  } catch {
    return null;
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
