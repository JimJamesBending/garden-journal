import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all profiles with garden + plant counts
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name, phone, plan, journal_revealed, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (!profiles) {
    return NextResponse.json({ users: [] });
  }

  // Get plant counts per user
  const profileIds = profiles.map((p) => p.id);
  const { data: gardens } = await admin
    .from("gardens")
    .select("id, owner_id")
    .in("owner_id", profileIds);

  const gardenMap = new Map<string, string>();
  for (const g of gardens || []) {
    gardenMap.set(g.owner_id, g.id);
  }

  const gardenIds = [...new Set(gardenMap.values())];
  let plantCounts: Record<string, number> = {};

  if (gardenIds.length > 0) {
    const { data: plants } = await admin
      .from("plants")
      .select("garden_id")
      .in("garden_id", gardenIds);

    for (const p of plants || []) {
      plantCounts[p.garden_id] = (plantCounts[p.garden_id] || 0) + 1;
    }
  }

  // Get last message time per user
  const { data: conversations } = await admin
    .from("conversations")
    .select("profile_id, last_message_at")
    .in("profile_id", profileIds)
    .order("last_message_at", { ascending: false });

  const lastMessageMap = new Map<string, string>();
  for (const c of conversations || []) {
    if (!lastMessageMap.has(c.profile_id)) {
      lastMessageMap.set(c.profile_id, c.last_message_at);
    }
  }

  const users = profiles.map((profile) => {
    const gardenId = gardenMap.get(profile.id);
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      plan: profile.plan,
      journalRevealed: profile.journal_revealed,
      plantCount: gardenId ? plantCounts[gardenId] || 0 : 0,
      lastMessage: lastMessageMap.get(profile.id) || null,
      createdAt: profile.created_at,
    };
  });

  return NextResponse.json({ users });
}
