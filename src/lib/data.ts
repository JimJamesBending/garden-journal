import { Plant, LogEntry } from "./types";
import plantsData from "../../data/plants.json";
import logsData from "../../data/logs.json";

export function getPlants(): Plant[] {
  return plantsData as Plant[];
}

export function getPlantBySlug(slug: string): Plant | undefined {
  return (plantsData as Plant[]).find((p) => p.slug === slug);
}

export function getLogs(): LogEntry[] {
  return logsData as LogEntry[];
}

export function getLogsForPlant(plantId: string): LogEntry[] {
  return (logsData as LogEntry[])
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getLatestLog(plantId: string): LogEntry | undefined {
  const logs = getLogsForPlant(plantId);
  return logs.length > 0 ? logs[logs.length - 1] : undefined;
}

export function daysSince(dateStr: string): number {
  const sow = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - sow.getTime()) / (1000 * 60 * 60 * 24));
}

export function getLatestStatus(
  plantId: string
): "sowed" | "germinated" | "transplanted" | "flowering" | "harvested" {
  const latest = getLatestLog(plantId);
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
