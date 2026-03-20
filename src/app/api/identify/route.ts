import { NextRequest, NextResponse } from "next/server";
import { identifyPlant, findMatchingPlant } from "@/lib/plant-id";
import { createClient } from "@/lib/supabase/server";
import { getGardenId, getPlants } from "@/lib/supabase/queries";

/**
 * POST /api/identify
 *
 * Identifies a plant from one or more Cloudinary image URLs.
 * Keeps the PlantNet API key server-side.
 *
 * Body: {
 *   imageUrls: string[]    -- Cloudinary URLs of the plant photos
 *   organ?: string          -- "leaf" | "flower" | "fruit" | "bark" | "auto"
 * }
 *
 * Returns: {
 *   results: PlantIdResult[]
 *   existingMatch: { id, commonName, latinName } | null
 *   query: { images, organ }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gardenId = await getGardenId(supabase);

    const body = await req.json();
    const { imageUrls, organ } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 }
      );
    }

    // Check if PlantNet is configured
    if (!process.env.PLANTNET_API_KEY) {
      return NextResponse.json(
        { error: "Plant identification is not configured. Add PLANTNET_API_KEY to environment variables." },
        { status: 503 }
      );
    }

    // Identify the plant
    const idResult = await identifyPlant({
      imageUrls,
      organ: organ || "auto",
    });

    // Check for existing plant match
    const plants = await getPlants(supabase, gardenId);
    let existingMatch = null;

    if (idResult.results.length > 0) {
      existingMatch = findMatchingPlant(idResult.results[0], plants);
    }

    return NextResponse.json({
      ...idResult,
      existingMatch,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Identification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
