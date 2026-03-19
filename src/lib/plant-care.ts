import { PlantCareProfile } from "./types";
import plantCareData from "../../data/plant-care.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const careDb = plantCareData as any as Record<string, PlantCareProfile>;

/**
 * Get care profile for a plant by its slug/id.
 * Falls back to partial match on common name.
 */
export function getCareProfile(plantId: string): PlantCareProfile | null {
  // Direct match
  if (careDb[plantId]) return careDb[plantId];

  // Try matching by common name fragments
  const lower = plantId.toLowerCase();
  for (const [key, profile] of Object.entries(careDb)) {
    if (
      lower.includes(key) ||
      key.includes(lower) ||
      profile.commonName.toLowerCase().includes(lower)
    ) {
      return profile;
    }
  }

  return null;
}

/**
 * Get all care profiles.
 */
export function getAllCareProfiles(): Record<string, PlantCareProfile> {
  return careDb;
}

/**
 * Get this month's task for a specific plant.
 */
export function getMonthlyTask(
  plantId: string,
  month?: number
): string | null {
  const profile = getCareProfile(plantId);
  if (!profile) return null;

  const m = month ?? new Date().getMonth() + 1;
  const key = m.toString().padStart(2, "0");
  return profile.monthlyTasks[key] || null;
}

/**
 * Get all plants that should be sown this month.
 */
export function getPlantsDueForSowing(month?: number): {
  indoor: { id: string; profile: PlantCareProfile }[];
  outdoor: { id: string; profile: PlantCareProfile }[];
} {
  const m = month ?? new Date().getMonth() + 1;
  const monthStr = m.toString().padStart(2, "0");

  const indoor: { id: string; profile: PlantCareProfile }[] = [];
  const outdoor: { id: string; profile: PlantCareProfile }[] = [];

  for (const [id, profile] of Object.entries(careDb)) {
    if (profile.sowIndoors) {
      const earliest = parseInt(profile.sowIndoors.earliest.split("-")[0]);
      const latest = parseInt(profile.sowIndoors.latest.split("-")[0]);
      if (m >= earliest && m <= latest) {
        indoor.push({ id, profile });
      }
    }
    if (profile.sowOutdoors) {
      const earliest = parseInt(profile.sowOutdoors.earliest.split("-")[0]);
      const latest = parseInt(profile.sowOutdoors.latest.split("-")[0]);
      if (m >= earliest && m <= latest) {
        outdoor.push({ id, profile });
      }
    }
  }

  return { indoor, outdoor };
}

/**
 * Check if a plant needs repotting based on days since sow date.
 * Returns advice string or null.
 */
export function checkRepottingNeeded(
  plantId: string,
  sowDate: string,
  currentStatus: string
): string | null {
  const profile = getCareProfile(plantId);
  if (!profile || !profile.repottingTrigger) return null;

  // Only relevant for germinated/sowed plants
  if (currentStatus !== "germinated" && currentStatus !== "sowed") return null;

  const daysSinceSow = Math.floor(
    (Date.now() - new Date(sowDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Rough heuristic: if germination max + 14 days have passed, likely needs potting on
  if (profile.daysToGermination) {
    const threshold = profile.daysToGermination.max + 14;
    if (daysSinceSow > threshold) {
      return `Your ${profile.commonName} has been growing for ${daysSinceSow} days since sowing — it likely needs potting on. ${profile.repottingTrigger}. Move to ${profile.repottingSize}.`;
    }
  }

  return null;
}

/**
 * Get companion planting advice for a plant.
 */
export function getCompanionAdvice(plantId: string): {
  good: string[];
  bad: string[];
} | null {
  const profile = getCareProfile(plantId);
  if (!profile) return null;

  return {
    good: profile.companionPlants,
    bad: profile.badCompanions,
  };
}

/**
 * Estimate days until harvest from sow date.
 */
export function estimateHarvestDate(
  plantId: string,
  sowDate: string
): { estimated: string; daysRemaining: number } | null {
  const profile = getCareProfile(plantId);
  if (!profile) return null;

  const daysToHarvest =
    "daysToHarvest" in profile && profile.daysToHarvest
      ? profile.daysToHarvest
      : null;

  if (!daysToHarvest) return null;

  const sow = new Date(sowDate);
  const avgDays = Math.round((daysToHarvest.min + daysToHarvest.max) / 2);
  const harvestDate = new Date(sow.getTime() + avgDays * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(
    0,
    Math.ceil((harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return {
    estimated: harvestDate.toISOString().split("T")[0],
    daysRemaining,
  };
}
