import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGardenId, getGrowth, createGrowth } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get("plantId") || undefined;

    const supabase = await createClient();
    const gardenId = await getGardenId(supabase);

    const entries = await getGrowth(supabase, gardenId, plantId);

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.plantId) {
    return NextResponse.json(
      { error: "plantId is required" },
      { status: 400 }
    );
  }

  const gardenId = await getGardenId(supabase);

  const entry = await createGrowth(supabase, gardenId, {
    plantId: body.plantId,
    date: body.date || new Date().toISOString().split("T")[0],
    heightCm: body.heightCm ?? null,
    leafCount: body.leafCount ?? null,
    healthScore: body.healthScore ?? null,
    notes: body.notes || "",
  });

  return NextResponse.json(entry, { status: 201 });
}
