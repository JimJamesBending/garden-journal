/**
 * WhatsApp webhook signature verification.
 * Verifies the X-Hub-Signature-256 header using HMAC-SHA256.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify that a webhook request came from Meta.
 * Returns true if the signature is valid.
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The X-Hub-Signature-256 header value (e.g. "sha256=abc123...")
 * @param appSecret - The WhatsApp App Secret from Meta dashboard
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;

  // Header format: "sha256=<hex>"
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) return false;

  const signatureHash = signature.slice(expectedPrefix.length);
  const computedHash = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signatureHash, "hex"),
      Buffer.from(computedHash, "hex")
    );
  } catch {
    // Buffer length mismatch = invalid signature
    return false;
  }
}
