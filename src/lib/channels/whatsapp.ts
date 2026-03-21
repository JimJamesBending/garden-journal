/**
 * WhatsApp Business API client
 * Handles sending messages, downloading media, and uploading to Cloudinary.
 */

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
 * Send read receipt (blue ticks) for a message.
 */
/**
 * Mark a message as read (blue ticks) AND show typing indicator.
 * The typing indicator piggybacks on the read receipt — requires the
 * inbound message_id, NOT the phone number.
 * Typing lasts up to 25 seconds or until we send a message.
 */
export async function markReadAndType(messageId: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  try {
    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: {
          type: "text",
        },
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[HAZEL] markReadAndType failed:", res.status, body);
    } else {
      console.log("[HAZEL] markReadAndType OK:", res.status, body);
    }
  } catch (e) {
    console.error("[HAZEL] markReadAndType error:", e);
  }
}

/**
 * Show typing indicator only (no read receipt).
 * Use this for re-fires during long processing — the original
 * markReadAndType already sent the read receipt.
 * Fire-and-forget: logs but never throws.
 */
export async function showTyping(messageId: string): Promise<void> {
  const token = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  try {
    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: {
          type: "text",
        },
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[HAZEL] showTyping failed:", res.status, body);
    } else {
      console.log("[HAZEL] showTyping OK:", res.status, body);
    }
  } catch (e) {
    console.error("[HAZEL] showTyping error:", e);
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
