import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readDebugLogs } from "@/lib/debug-log";

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

  const type = req.nextUrl.searchParams.get("type");
  const admin = createAdminClient();

  // Activity feed endpoint
  if (type === "activity") {
    const events = await readDebugLogs(20);
    return NextResponse.json({ events });
  }

  // Overview stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    usersResult,
    plantsResult,
    conversationsResult,
    messagesTodayResult,
    spacesResult,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("plants").select("id", { count: "exact", head: true }),
    admin.from("conversations").select("id", { count: "exact", head: true }),
    admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    admin.from("spaces").select("id", { count: "exact", head: true }),
  ]);

  // Recent errors from debug logs
  const recentLogs = await readDebugLogs(50);
  const errorCount = (recentLogs as unknown as Array<{ event: string }>).filter(
    (l) => l.event?.toLowerCase().includes("error")
  ).length;

  return NextResponse.json({
    users: usersResult.count || 0,
    plants: plantsResult.count || 0,
    conversations: conversationsResult.count || 0,
    messagesToday: messagesTodayResult.count || 0,
    spaces: spacesResult.count || 0,
    recentErrors: errorCount,
    timestamp: now.toISOString(),
  });
}
