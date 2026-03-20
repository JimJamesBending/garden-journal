import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Save a message to the conversations/messages tables.
 * Uses admin client (bypasses RLS).
 */
export async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  mediaUrls: string[] = []
): Promise<string> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      media_urls: mediaUrls,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Update last_message_at on the conversation
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data.id;
}
