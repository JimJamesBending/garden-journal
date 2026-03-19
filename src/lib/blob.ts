import { put, list } from "@vercel/blob";
import { Plant, LogEntry, GrowthEntry } from "./types";
import seedPlants from "../../data/plants.json";

const PLANTS_KEY = "garden-plants.json";
const LOGS_KEY = "garden-logs.json";
const GROWTH_KEY = "garden-growth.json";

async function readBlob<T>(key: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix: key });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url);
      return (await res.json()) as T;
    }
  } catch {
    // Blob store not configured or empty
  }
  return fallback;
}

async function writeBlob(key: string, data: unknown): Promise<void> {
  await put(key, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// --- Plants ---

export async function getPlants(): Promise<Plant[]> {
  const plants = await readBlob<Plant[]>(PLANTS_KEY, []);
  if (plants.length === 0) {
    // Seed from static file on first access
    await writeBlob(PLANTS_KEY, seedPlants);
    return seedPlants as Plant[];
  }
  return plants;
}

export async function savePlants(plants: Plant[]): Promise<void> {
  await writeBlob(PLANTS_KEY, plants);
}

// --- Logs ---

export async function getLogs(): Promise<LogEntry[]> {
  return readBlob<LogEntry[]>(LOGS_KEY, []);
}

export async function saveLogs(logs: LogEntry[]): Promise<void> {
  await writeBlob(LOGS_KEY, logs);
}

// --- Growth ---

export async function getGrowth(): Promise<GrowthEntry[]> {
  return readBlob<GrowthEntry[]>(GROWTH_KEY, []);
}

export async function saveGrowth(entries: GrowthEntry[]): Promise<void> {
  await writeBlob(GROWTH_KEY, entries);
}
