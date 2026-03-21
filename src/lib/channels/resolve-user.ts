import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

interface ResolvedUser {
  userId: string;
  gardenId: string;
  conversationId: string;
  isNew: boolean;
}

/**
 * Find or create a user from a WhatsApp phone number.
 * - Looks up existing conversation by phone
 * - If new: creates auth user, profile+garden auto-created by DB triggers
 * - Generates a public slug for the garden page
 * - Creates or finds the conversation record
 */
export async function resolveWhatsAppUser(
  supabase: SupabaseClient,
  phone: string,
  profileName?: string
): Promise<ResolvedUser> {
  // Check for existing conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, profile_id")
    .eq("channel", "whatsapp")
    .eq("channel_user_id", phone)
    .single();

  if (existing) {
    // Find their garden
    const { data: garden } = await supabase
      .from("gardens")
      .select("id")
      .eq("owner_id", existing.profile_id)
      .single();

    return {
      userId: existing.profile_id,
      gardenId: garden?.id || "",
      conversationId: existing.id,
      isNew: false,
    };
  }

  // New user — create via admin auth
  const placeholderEmail = `wa-${phone.replace(/\+/g, "")}@hazel.garden`;

  let userId: string;
  let isNewAuthUser = false;

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: placeholderEmail,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        name: profileName || "Gardener",
        source: "whatsapp",
      },
    });

  if (authError) {
    // Auth user already exists (e.g. conversation was deleted but user remains).
    // Look them up by email and re-create the conversation.
    console.log("[HAZEL] Auth user already exists for %s, looking up...", phone);
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === placeholderEmail
    );
    if (!existingUser) throw authError; // genuinely unexpected — rethrow
    userId = existingUser.id;
  } else {
    userId = authData.user.id;
    isNewAuthUser = true;
  }

  if (isNewAuthUser) {
    // DB trigger handle_new_user() creates profile
    // DB trigger handle_new_profile() creates garden
    // Wait a moment for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Set public slug on profile
    const slug = `g-${crypto.randomBytes(4).toString("hex")}`;
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        public_slug: slug,
        phone,
        name: profileName || "Gardener",
      })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error("[HAZEL] Failed to update profile with slug/phone:", profileUpdateError);
    }
  }

  // Get the garden (auto-created by trigger for new users, already exists for returning)
  const { data: garden } = await supabase
    .from("gardens")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (!garden) throw new Error("Garden not created by trigger");

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      profile_id: userId,
      channel: "whatsapp",
      channel_user_id: phone,
    })
    .select("id")
    .single();

  if (convError) throw convError;

  return {
    userId,
    gardenId: garden.id,
    conversationId: conversation.id,
    isNew: isNewAuthUser,
  };
}
