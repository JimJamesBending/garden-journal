import { Plant, LogEntry } from "./types";
import { createClient } from "./supabase/server";
import {
  getGardenId,
  getPlants as fetchPlants,
  getLogs as fetchLogs,
} from "./supabase/queries";

export async function getPlants(): Promise<Plant[]> {
  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);
  return fetchPlants(supabase, gardenId);
}

export async function getPlantBySlug(
  slug: string
): Promise<Plant | undefined> {
  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);

  const { data } = await supabase
    .from("plants")
    .select("*")
    .eq("garden_id", gardenId)
    .eq("slug", slug)
    .single();

  if (!data) return undefined;

  return {
    id: data.id,
    slug: data.slug,
    commonName: data.common_name,
    variety: data.variety || "Unknown",
    latinName: data.latin_name || "",
    confidence: data.confidence || "partial",
    sowDate: data.sow_date,
    location: data.location || "indoor",
    category: data.category || "flower",
    notes: data.notes || "",
    seedSource: data.seed_source || "",
  };
}

export async function getLogs(): Promise<LogEntry[]> {
  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);
  return fetchLogs(supabase, gardenId);
}

export async function getLogsForPlant(
  plantId: string
): Promise<LogEntry[]> {
  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);

  const { data } = await supabase
    .from("log_entries")
    .select("*")
    .eq("garden_id", gardenId)
    .eq("plant_id", plantId)
    .order("date", { ascending: true });

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    plantId: (row.plant_id as string) || "",
    date: row.date as string,
    cloudinaryUrl: (row.cloudinary_url as string) || "",
    caption: (row.caption as string) || "",
    status: (row.status as LogEntry["status"]) || "sowed",
    labeled: (row.labeled as boolean) || false,
  }));
}

export async function getLatestLog(
  plantId: string
): Promise<LogEntry | undefined> {
  const logs = await getLogsForPlant(plantId);
  return logs.length > 0 ? logs[logs.length - 1] : undefined;
}

export function daysSince(dateStr: string): number {
  const sow = new Date(dateStr);
  const now = new Date();
  return Math.floor(
    (now.getTime() - sow.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export async function getLatestStatus(
  plantId: string
): Promise<
  "sowed" | "germinated" | "transplanted" | "flowering" | "harvested"
> {
  const latest = await getLatestLog(plantId);
  return latest?.status ?? "sowed";
}

export function getCategoryEmoji(category: string): string {
  switch (category) {
    case "fruit":
      return "\u{1F353}";
    case "vegetable":
      return "\u{1F955}";
    case "herb":
      return "\u{1F33F}";
    case "flower":
      return "\u{1F33A}";
    default:
      return "\u{1F331}";
  }
}
