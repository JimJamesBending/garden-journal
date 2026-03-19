import { Plant, LogEntry } from "./types";
import {
  getPlants as getBlobPlants,
  getLogs as getBlobLogs,
} from "./blob";

export async function getPlants(): Promise<Plant[]> {
  return getBlobPlants();
}

export async function getPlantBySlug(
  slug: string
): Promise<Plant | undefined> {
  const plants = await getBlobPlants();
  return plants.find((p) => p.slug === slug);
}

export async function getLogs(): Promise<LogEntry[]> {
  return getBlobLogs();
}

export async function getLogsForPlant(
  plantId: string
): Promise<LogEntry[]> {
  const logs = await getBlobLogs();
  return logs
    .filter((l) => l.plantId === plantId)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
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
