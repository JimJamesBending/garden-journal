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

  // Get data for last 30 days
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [messagesResult, plantsResult, usersResult] = await Promise.all([
    admin
      .from("messages")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
    admin
      .from("plants")
      .select("created_at, common_name, category")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
    admin
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
  ]);

  // Group by day
  function groupByDay(
    items: Array<{ created_at: string }> | null
  ): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const item of items || []) {
      const day = item.created_at.split("T")[0];
      groups[day] = (groups[day] || 0) + 1;
    }
    return groups;
  }

  const messagesByDay = groupByDay(messagesResult.data);
  const plantsByDay = groupByDay(plantsResult.data);
  const usersByDay = groupByDay(usersResult.data);

  // Build daily series for last 30 days
  const dailyData: Array<{
    date: string;
    messages: number;
    plants: number;
    users: number;
  }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = date.toISOString().split("T")[0];
    dailyData.push({
      date: day,
      messages: messagesByDay[day] || 0,
      plants: plantsByDay[day] || 0,
      users: usersByDay[day] || 0,
    });
  }

  // Top identified species
  const speciesCounts: Record<string, number> = {};
  for (const p of plantsResult.data || []) {
    const name = p.common_name || "Unknown";
    speciesCounts[name] = (speciesCounts[name] || 0) + 1;
  }
  const topSpecies = Object.entries(speciesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const p of plantsResult.data || []) {
    const cat = p.category || "unknown";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Conversion funnel — how many users have 1+ messages, 2+ plants, 5+ plants, journal revealed
  const allProfiles = await admin
    .from("profiles")
    .select("id, journal_revealed");

  const allGardens = await admin.from("gardens").select("id, owner_id");
  const allPlants = await admin.from("plants").select("garden_id");
  const allConversations = await admin.from("conversations").select("profile_id");

  const totalUsers = allProfiles.data?.length || 0;

  const usersWithConversations = new Set(
    (allConversations.data || []).map((c) => c.profile_id)
  ).size;

  // Count plants per user
  const gardenToOwner = new Map<string, string>();
  for (const g of allGardens.data || []) {
    gardenToOwner.set(g.id, g.owner_id);
  }
  const plantsByOwner: Record<string, number> = {};
  for (const p of allPlants.data || []) {
    const owner = gardenToOwner.get(p.garden_id);
    if (owner) plantsByOwner[owner] = (plantsByOwner[owner] || 0) + 1;
  }

  const usersWith2Plants = Object.values(plantsByOwner).filter((c) => c >= 2).length;
  const usersWith5Plants = Object.values(plantsByOwner).filter((c) => c >= 5).length;
  const journalRevealed = (allProfiles.data || []).filter((p) => p.journal_revealed).length;

  return NextResponse.json({
    dailyData,
    topSpecies,
    categoryCounts,
    funnel: {
      totalUsers,
      withConversation: usersWithConversations,
      with2Plants: usersWith2Plants,
      with5Plants: usersWith5Plants,
      journalRevealed,
    },
  });
}
