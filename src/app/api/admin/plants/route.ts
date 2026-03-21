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
  const category = req.nextUrl.searchParams.get("category");
  const confidence = req.nextUrl.searchParams.get("confidence");

  // Get all plants
  let query = admin
    .from("plants")
    .select("id, garden_id, common_name, latin_name, variety, confidence, category, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (category) query = query.eq("category", category);
  if (confidence) query = query.eq("confidence", confidence);

  const { data: plants } = await query;

  if (!plants || plants.length === 0) {
    return NextResponse.json({ plants: [] });
  }

  // Get garden owners
  const gardenIds = [...new Set(plants.map((p) => p.garden_id))];
  const { data: gardens } = await admin
    .from("gardens")
    .select("id, owner_id")
    .in("id", gardenIds);

  const gardenOwnerMap = new Map<string, string>();
  for (const g of gardens || []) {
    gardenOwnerMap.set(g.id, g.owner_id);
  }

  const ownerIds = [...new Set(gardenOwnerMap.values())];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name")
    .in("id", ownerIds);

  const profileMap = new Map<string, string>();
  for (const p of profiles || []) {
    profileMap.set(p.id, p.name);
  }

  // Get latest photo per plant
  const plantIds = plants.map((p) => p.id);
  const { data: logs } = await admin
    .from("log_entries")
    .select("plant_id, cloudinary_url")
    .in("plant_id", plantIds)
    .order("date", { ascending: false });

  const photoMap = new Map<string, string>();
  for (const l of logs || []) {
    if (l.plant_id && l.cloudinary_url && !photoMap.has(l.plant_id)) {
      photoMap.set(l.plant_id, l.cloudinary_url);
    }
  }

  const result = plants.map((p) => {
    const ownerId = gardenOwnerMap.get(p.garden_id) || "";
    return {
      id: p.id,
      commonName: p.common_name,
      latinName: p.latin_name,
      variety: p.variety,
      confidence: p.confidence,
      category: p.category,
      notes: p.notes,
      owner: profileMap.get(ownerId) || "Unknown",
      photoUrl: photoMap.get(p.id) || null,
      createdAt: p.created_at,
    };
  });

  return NextResponse.json({ plants: result });
}
