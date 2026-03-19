import { put, list } from "@vercel/blob";
import { Plant, LogEntry, GrowthEntry, CareEvent, SoilReading, AdviceEntry, WeatherSnapshot } from "./types";
import seedPlants from "../../data/plants.json";

const PLANTS_KEY = "garden-plants.json";
const LOGS_KEY = "garden-logs.json";
const GROWTH_KEY = "garden-growth.json";
const CARE_KEY = "garden-care.json";
const SOIL_KEY = "garden-soil.json";
const ADVICE_KEY = "garden-advice.json";
const WEATHER_KEY = "garden-weather.json";

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

// --- Care Events ---

export async function getCareEvents(): Promise<CareEvent[]> {
  return readBlob<CareEvent[]>(CARE_KEY, []);
}

export async function saveCareEvents(events: CareEvent[]): Promise<void> {
  await writeBlob(CARE_KEY, events);
}

// --- Soil Readings ---

export async function getSoilReadings(): Promise<SoilReading[]> {
  return readBlob<SoilReading[]>(SOIL_KEY, []);
}

export async function saveSoilReadings(readings: SoilReading[]): Promise<void> {
  await writeBlob(SOIL_KEY, readings);
}

// --- Advice ---

export async function getAdvice(): Promise<AdviceEntry[]> {
  return readBlob<AdviceEntry[]>(ADVICE_KEY, []);
}

export async function saveAdvice(advice: AdviceEntry[]): Promise<void> {
  await writeBlob(ADVICE_KEY, advice);
}

// --- Weather Cache ---

export async function getWeatherCache(): Promise<WeatherSnapshot[]> {
  return readBlob<WeatherSnapshot[]>(WEATHER_KEY, []);
}

export async function saveWeatherCache(snapshots: WeatherSnapshot[]): Promise<void> {
  await writeBlob(WEATHER_KEY, snapshots);
}
