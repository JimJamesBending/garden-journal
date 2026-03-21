import { SupabaseClient } from "@supabase/supabase-js";

const INITIAL_WAIT_MS = 3000; // Wait 3s for more images to arrive
const EXTENDED_WAIT_MS = 5000; // Extra 5s if batch detected (8s total)

export interface PendingImage {
  id: string;
  phone: string;
  profile_name: string;
  whatsapp_message_id: string;
  media_id: string;
  mime_type: string;
  caption: string;
}

/**
 * Enqueue a pending image into the batch queue.
 * Uses a Postgres function with FOR UPDATE lock to atomically check
 * if this is the first image in a batch for this phone number.
 *
 * Returns true if this is the first image (caller should send the ack).
 */
export async function enqueuePendingImage(
  supabase: SupabaseClient,
  phone: string,
  profileName: string,
  messageId: string,
  mediaId: string,
  mimeType: string,
  caption: string
): Promise<{ isFirstInBatch: boolean }> {
  const { data, error } = await supabase.rpc("enqueue_pending_image", {
    p_phone: phone,
    p_profile_name: profileName,
    p_message_id: messageId,
    p_media_id: mediaId,
    p_mime_type: mimeType,
    p_caption: caption || "",
  });

  if (error) {
    console.error("[HAZEL] Enqueue error:", error);
    // Fallback: treat as first to ensure ack is sent
    return { isFirstInBatch: true };
  }

  return { isFirstInBatch: data === true };
}

/**
 * Wait for the batch window, then try to claim all pending images.
 *
 * Adaptive timing:
 * - Always waits 3 seconds initially (enough for a 2nd image to arrive)
 * - If more images detected, extends by 5 seconds (8s total)
 * - Single photo: only 3s added latency
 *
 * Returns the batch if this invocation wins the advisory lock,
 * or null if another invocation is already processing.
 */
export async function waitAndClaimBatch(
  supabase: SupabaseClient,
  phone: string
): Promise<PendingImage[] | null> {
  // Short initial wait — enough for a 2nd image to arrive
  await new Promise((resolve) => setTimeout(resolve, INITIAL_WAIT_MS));

  // Check if more images have arrived during the wait
  const { count } = await supabase
    .from("pending_images")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone);

  if ((count || 0) > 1) {
    // Multiple images detected — extend window for more to arrive
    console.log("[HAZEL] Batch detected (%d images), extending window...", count);
    await new Promise((resolve) => setTimeout(resolve, EXTENDED_WAIT_MS));
  }

  // Try to atomically claim the batch via advisory lock
  const { data, error } = await supabase.rpc("try_claim_image_batch", {
    user_phone: phone,
  });

  if (error) {
    console.error("[HAZEL] Batch claim error:", error);
    return null;
  }

  if (!data || data.length === 0) {
    // Another invocation already claimed this batch
    return null;
  }

  return data as PendingImage[];
}
