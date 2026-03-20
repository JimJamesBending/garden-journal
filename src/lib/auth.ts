import { SupabaseClient } from "@supabase/supabase-js";

export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
