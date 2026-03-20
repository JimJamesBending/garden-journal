/**
 * Database Abstraction Layer
 *
 * Currently wraps Vercel Blob operations.
 * Future: swap to PostgreSQL (Vercel Postgres / Neon)
 * without changing any component code.
 *
 * All data access should go through this module,
 * not directly through blob.ts.
 */

import {
  getPlants,
  savePlants,
  getLogs,
  saveLogs,
  getGrowth,
  saveGrowth,
  getCareEvents,
  saveCareEvents,
  getSoilReadings,
  saveSoilReadings,
  getAdvice,
  saveAdvice,
  getWeatherCache,
  saveWeatherCache,
  getSpaces,
  saveSpaces,
} from "./blob";

import type {
  Plant,
  LogEntry,
  GrowthEntry,
  CareEvent,
  SoilReading,
  AdviceEntry,
  WeatherSnapshot,
  Space,
} from "./types";

// Re-export all data access functions through this abstraction
// When migrating to Postgres, replace these implementations

export const db = {
  // --- Plants ---
  plants: {
    getAll: (): Promise<Plant[]> => getPlants(),
    save: (plants: Plant[]): Promise<void> => savePlants(plants),
    getById: async (id: string): Promise<Plant | null> => {
      const plants = await getPlants();
      return plants.find((p) => p.id === id) || null;
    },
    create: async (plant: Omit<Plant, "id">): Promise<Plant> => {
      const plants = await getPlants();
      const newPlant: Plant = { ...plant, id: `plant-${Date.now()}` } as Plant;
      plants.push(newPlant);
      await savePlants(plants);
      return newPlant;
    },
    update: async (id: string, updates: Partial<Plant>): Promise<Plant | null> => {
      const plants = await getPlants();
      const index = plants.findIndex((p) => p.id === id);
      if (index === -1) return null;
      plants[index] = { ...plants[index], ...updates };
      await savePlants(plants);
      return plants[index];
    },
    delete: async (id: string): Promise<boolean> => {
      const plants = await getPlants();
      const filtered = plants.filter((p) => p.id !== id);
      if (filtered.length === plants.length) return false;
      await savePlants(filtered);
      return true;
    },
  },

  // --- Logs ---
  logs: {
    getAll: (): Promise<LogEntry[]> => getLogs(),
    save: (logs: LogEntry[]): Promise<void> => saveLogs(logs),
    getByPlant: async (plantId: string): Promise<LogEntry[]> => {
      const logs = await getLogs();
      return logs.filter((l) => l.plantId === plantId);
    },
    create: async (log: Omit<LogEntry, "id">): Promise<LogEntry> => {
      const logs = await getLogs();
      const newLog: LogEntry = { ...log, id: `log-${Date.now()}` } as LogEntry;
      logs.push(newLog);
      await saveLogs(logs);
      return newLog;
    },
  },

  // --- Growth ---
  growth: {
    getAll: (): Promise<GrowthEntry[]> => getGrowth(),
    save: (entries: GrowthEntry[]): Promise<void> => saveGrowth(entries),
    getByPlant: async (plantId: string): Promise<GrowthEntry[]> => {
      const entries = await getGrowth();
      return entries.filter((g) => g.plantId === plantId);
    },
  },

  // --- Care Events ---
  care: {
    getAll: (): Promise<CareEvent[]> => getCareEvents(),
    save: (events: CareEvent[]): Promise<void> => saveCareEvents(events),
    getByPlant: async (plantId: string): Promise<CareEvent[]> => {
      const events = await getCareEvents();
      return events.filter((e) => e.plantId === plantId);
    },
  },

  // --- Soil ---
  soil: {
    getAll: (): Promise<SoilReading[]> => getSoilReadings(),
    save: (readings: SoilReading[]): Promise<void> => saveSoilReadings(readings),
  },

  // --- Advice ---
  advice: {
    getAll: (): Promise<AdviceEntry[]> => getAdvice(),
    save: (advice: AdviceEntry[]): Promise<void> => saveAdvice(advice),
  },

  // --- Weather Cache ---
  weather: {
    getCache: (): Promise<WeatherSnapshot[]> => getWeatherCache(),
    saveCache: (snapshots: WeatherSnapshot[]): Promise<void> => saveWeatherCache(snapshots),
  },

  // --- Spaces ---
  spaces: {
    getAll: (): Promise<Space[]> => getSpaces(),
    save: (spaces: Space[]): Promise<void> => saveSpaces(spaces),
    getById: async (id: string): Promise<Space | null> => {
      const spaces = await getSpaces();
      return spaces.find((s) => s.id === id) || null;
    },
  },
};
