import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Not admin");
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const conversationId = req.nextUrl.searchParams.get("id");

  // Single conversation with messages
  if (conversationId) {
    const { data: conversation } = await admin
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: messages } = await admin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    // Get profile info
    const { data: profile } = await admin
      .from("profiles")
      .select("name, phone")
      .eq("id", conversation.profile_id)
      .single();

    return NextResponse.json({
      conversation,
      messages: messages || [],
      profile,
    });
  }

  // All conversations with profile info
  const { data: conversations } = await admin
    .from("conversations")
    .select("id, profile_id, channel, channel_user_id, last_message_at, created_at")
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (!conversations) {
    return NextResponse.json({ conversations: [] });
  }

  // Get profile names
  const profileIds = [...new Set(conversations.map((c) => c.profile_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, phone")
    .in("id", profileIds);

  const profileMap = new Map<string, { name: string; phone: string }>();
  for (const p of profiles || []) {
    profileMap.set(p.id, { name: p.name, phone: p.phone });
  }

  // Get message counts
  const { data: messageCounts } = await admin
    .from("messages")
    .select("conversation_id")
    .in(
      "conversation_id",
      conversations.map((c) => c.id)
    );

  const countMap: Record<string, number> = {};
  for (const m of messageCounts || []) {
    countMap[m.conversation_id] = (countMap[m.conversation_id] || 0) + 1;
  }

  const result = conversations.map((c) => ({
    id: c.id,
    userName: profileMap.get(c.profile_id)?.name || "Unknown",
    userPhone: profileMap.get(c.profile_id)?.phone || "",
    channel: c.channel,
    messageCount: countMap[c.id] || 0,
    lastMessageAt: c.last_message_at,
    createdAt: c.created_at,
  }));

  return NextResponse.json({ conversations: result });
}
