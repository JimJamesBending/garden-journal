import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGardenId, getPlants, createPlant } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const gardenId = await getGardenId(supabase);
    const plants = await getPlants(supabase, gardenId);
    return NextResponse.json(plants);
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
  const { commonName, variety, latinName, category, sowDate, location, notes } =
    body;

  if (!commonName) {
    return NextResponse.json(
      { error: "commonName is required" },
      { status: 400 }
    );
  }

  const slug = commonName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const gardenId = await getGardenId(supabase);

  const plant = await createPlant(supabase, gardenId, {
    slug,
    commonName,
    variety: variety || "Unknown",
    latinName: latinName || "",
    confidence: "partial",
    sowDate: sowDate || new Date().toISOString().split("T")[0],
    location: location || "indoor",
    category: category || "flower",
    notes: notes || "",
    seedSource: "Added via portal",
  });

  return NextResponse.json(plant, { status: 201 });
}
