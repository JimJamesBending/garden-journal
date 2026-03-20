/**
 * PlantNet API client for plant identification.
 *
 * Free tier: https://my.plantnet.org/
 * Endpoint: POST https://my-api.plantnet.org/v2/identify/all
 * Input: Up to 5 images, specify organ type (leaf/flower/fruit/auto)
 * Output: Species suggestions with confidence scores
 *
 * API key is stored in PLANTNET_API_KEY env var.
 */

import { PlantIdResult, PlantIdResponse } from "./types";

const PLANTNET_BASE = "https://my-api.plantnet.org/v2/identify/all";

export type OrganType = "leaf" | "flower" | "fruit" | "bark" | "auto";

interface IdentifyOptions {
  /** Cloudinary URLs of the plant photos */
  imageUrls: string[];
  /** What part of the plant is shown */
  organ?: OrganType;
}

interface PlantNetSpecies {
  scientificNameWithoutAuthor: string;
  scientificNameAuthorship: string;
  scientificName: string;
  genus: { scientificNameWithoutAuthor: string };
  family: { scientificNameWithoutAuthor: string };
  commonNames: string[];
}

interface PlantNetResult {
  score: number;
  species: PlantNetSpecies;
  images: Array<{
    url: { o: string; m: string; s: string };
    organ: string;
  }>;
}

interface PlantNetResponse {
  query: {
    images: string[];
    organs: string[];
  };
  results: PlantNetResult[];
  remainingIdentificationRequests: number;
}

/**
 * Identify a plant from one or more photo URLs.
 * Returns top 5 matches with confidence scores.
 */
export async function identifyPlant(
  options: IdentifyOptions
): Promise<PlantIdResponse> {
  const apiKey = process.env.PLANTNET_API_KEY;

  if (!apiKey) {
    throw new Error("PLANTNET_API_KEY not configured");
  }

  if (!options.imageUrls || options.imageUrls.length === 0) {
    throw new Error("At least one image URL is required");
  }

  const organ = options.organ || "auto";

  // Build URL with query params — PlantNet uses URL-based image input
  const url = new URL(PLANTNET_BASE);
  url.searchParams.set("include-related-images", "true");
  url.searchParams.set("no-reject", "false");
  url.searchParams.set("lang", "en");
  url.searchParams.set("api-key", apiKey);

  // PlantNet accepts images as form data with image URLs
  const formData = new FormData();
  for (const imageUrl of options.imageUrls.slice(0, 5)) {
    formData.append("images", imageUrl);
    formData.append("organs", organ);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PlantNet API error ${res.status}: ${errText}`);
  }

  const data: PlantNetResponse = await res.json();

  // Transform to our internal format
  const results: PlantIdResult[] = data.results
    .slice(0, 5)
    .map((r) => ({
      species: r.species.scientificNameWithoutAuthor,
      commonName:
        r.species.commonNames?.[0] || r.species.scientificNameWithoutAuthor,
      confidence: Math.round(r.score * 100),
      family: r.species.family.scientificNameWithoutAuthor,
      genus: r.species.genus.scientificNameWithoutAuthor,
      imageUrl: r.images?.[0]?.url?.m,
    }));

  return {
    results,
    query: {
      images: options.imageUrls,
      organ,
    },
  };
}

/**
 * Check if we have an existing plant that matches a PlantNet result.
 * Compares by common name and latin name (case-insensitive).
 */
export function findMatchingPlant(
  result: PlantIdResult,
  existingPlants: Array<{ id: string; commonName: string; latinName: string }>
): { id: string; commonName: string; latinName: string } | null {
  const resultNameLower = result.commonName.toLowerCase();
  const resultSpeciesLower = result.species.toLowerCase();

  return (
    existingPlants.find(
      (p) =>
        p.commonName.toLowerCase() === resultNameLower ||
        p.latinName.toLowerCase() === resultSpeciesLower ||
        p.latinName.toLowerCase().includes(resultSpeciesLower) ||
        resultSpeciesLower.includes(p.latinName.toLowerCase())
    ) || null
  );
}
