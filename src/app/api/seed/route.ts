import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGardenId, getPlants, createPlant } from "@/lib/supabase/queries";
import type { Plant } from "@/lib/types";
import seedPlants from "../../../../data/plants.json";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gardenId = await getGardenId(supabase);

    // Check if garden already has plants
    const existing = await getPlants(supabase, gardenId);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Garden already has plants. Seed skipped.", existing: existing.length },
        { status: 409 }
      );
    }

    // Insert seed plants
    const created = [];
    for (const seed of seedPlants) {
      const plant = await createPlant(supabase, gardenId, {
        slug: seed.slug,
        commonName: seed.commonName,
        variety: seed.variety || "Unknown",
        latinName: seed.latinName || "",
        confidence: (seed.confidence as "confirmed" | "partial") || "partial",
        sowDate: seed.sowDate,
        location: (seed.location as Plant["location"]) || "indoor",
        category: (seed.category as Plant["category"]) || "flower",
        notes: seed.notes || "",
        seedSource: seed.seedSource || "",
      });
      created.push(plant);
    }

    return NextResponse.json({
      ok: true,
      seeded: created.length,
      plants: created.map((p) => ({ id: p.id, name: p.commonName })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
