import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Plant,
  LogEntry,
  GrowthEntry,
  CareEvent,
  SoilReading,
  AdviceEntry,
  WeatherSnapshot,
  Space,
} from "../types";

// ============================================
// AUTH HELPERS
// ============================================

export async function getGardenId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: garden, error } = await supabase
    .from("gardens")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (error || !garden) throw new Error("No garden found");
  return garden.id;
}

export async function requireAuth(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

// ============================================
// COLUMN MAPPERS: snake_case DB ↔ camelCase TS
// ============================================

function mapPlantFromDb(row: Record<string, unknown>): Plant {
  return {
    id: row.id as string,
    slug: row.slug as string,
    commonName: row.common_name as string,
    variety: (row.variety as string) || "Unknown",
    latinName: (row.latin_name as string) || "",
    confidence: (row.confidence as "confirmed" | "partial") || "partial",
    sowDate: row.sow_date as string,
    location: (row.location as Plant["location"]) || "indoor",
    category: (row.category as Plant["category"]) || "flower",
    notes: (row.notes as string) || "",
    seedSource: (row.seed_source as string) || "",
  };
}

function mapPlantToDb(
  plant: Partial<Plant>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (plant.slug !== undefined) row.slug = plant.slug;
  if (plant.commonName !== undefined) row.common_name = plant.commonName;
  if (plant.variety !== undefined) row.variety = plant.variety;
  if (plant.latinName !== undefined) row.latin_name = plant.latinName;
  if (plant.confidence !== undefined) row.confidence = plant.confidence;
  if (plant.sowDate !== undefined) row.sow_date = plant.sowDate;
  if (plant.location !== undefined) row.location = plant.location;
  if (plant.category !== undefined) row.category = plant.category;
  if (plant.notes !== undefined) row.notes = plant.notes;
  if (plant.seedSource !== undefined) row.seed_source = plant.seedSource;
  return row;
}

function mapLogFromDb(row: Record<string, unknown>): LogEntry {
  return {
    id: row.id as string,
    plantId: (row.plant_id as string) || "",
    date: row.date as string,
    cloudinaryUrl: (row.cloudinary_url as string) || "",
    caption: (row.caption as string) || "",
    status:
      (row.status as
        | "sowed"
        | "germinated"
        | "transplanted"
        | "flowering"
        | "harvested") || "sowed",
    labeled: (row.labeled as boolean) || false,
  };
}

function mapLogToDb(
  log: Partial<LogEntry>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (log.plantId !== undefined) row.plant_id = log.plantId || null;
  if (log.date !== undefined) row.date = log.date;
  if (log.cloudinaryUrl !== undefined) row.cloudinary_url = log.cloudinaryUrl;
  if (log.caption !== undefined) row.caption = log.caption;
  if (log.status !== undefined) row.status = log.status;
  if (log.labeled !== undefined) row.labeled = log.labeled;
  return row;
}

function mapGrowthFromDb(row: Record<string, unknown>): GrowthEntry {
  return {
    id: row.id as string,
    plantId: row.plant_id as string,
    date: row.date as string,
    heightCm: row.height_cm as number,
    leafCount: row.leaf_count as number,
    healthScore: row.health_score as number,
    notes: (row.notes as string) || "",
  };
}

function mapGrowthToDb(
  entry: Partial<GrowthEntry>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (entry.plantId !== undefined) row.plant_id = entry.plantId;
  if (entry.date !== undefined) row.date = entry.date;
  if (entry.heightCm !== undefined) row.height_cm = entry.heightCm;
  if (entry.leafCount !== undefined) row.leaf_count = entry.leafCount;
  if (entry.healthScore !== undefined) row.health_score = entry.healthScore;
  if (entry.notes !== undefined) row.notes = entry.notes;
  return row;
}

function mapCareFromDb(row: Record<string, unknown>): CareEvent {
  return {
    id: row.id as string,
    plantId: row.plant_id as string,
    type: row.type as CareEvent["type"],
    date: row.date as string,
    notes: (row.notes as string) || "",
    quantity: (row.quantity as string) || "",
  };
}

function mapCareToDb(
  event: Partial<CareEvent>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (event.plantId !== undefined) row.plant_id = event.plantId;
  if (event.type !== undefined) row.type = event.type;
  if (event.date !== undefined) row.date = event.date;
  if (event.notes !== undefined) row.notes = event.notes;
  if (event.quantity !== undefined) row.quantity = event.quantity;
  return row;
}

function mapSoilFromDb(row: Record<string, unknown>): SoilReading {
  return {
    id: row.id as string,
    plantId: row.plant_id as string,
    date: row.date as string,
    ph: row.ph as number,
    nitrogen: row.nitrogen as SoilReading["nitrogen"],
    phosphorus: row.phosphorus as SoilReading["phosphorus"],
    potassium: row.potassium as SoilReading["potassium"],
    moisture: row.moisture as SoilReading["moisture"],
    notes: (row.notes as string) || "",
  };
}

function mapSoilToDb(
  reading: Partial<SoilReading>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (reading.plantId !== undefined) row.plant_id = reading.plantId;
  if (reading.date !== undefined) row.date = reading.date;
  if (reading.ph !== undefined) row.ph = reading.ph;
  if (reading.nitrogen !== undefined) row.nitrogen = reading.nitrogen;
  if (reading.phosphorus !== undefined) row.phosphorus = reading.phosphorus;
  if (reading.potassium !== undefined) row.potassium = reading.potassium;
  if (reading.moisture !== undefined) row.moisture = reading.moisture;
  if (reading.notes !== undefined) row.notes = reading.notes;
  return row;
}

function mapAdviceFromDb(row: Record<string, unknown>): AdviceEntry {
  return {
    id: row.id as string,
    category: row.category as AdviceEntry["category"],
    priority: row.priority as AdviceEntry["priority"],
    title: row.title as string,
    body: (row.body as string) || "",
    plantId: (row.plant_id as string) || "",
    actionRequired: (row.action_required as boolean) || false,
    dismissed: (row.dismissed as boolean) || false,
    generatedAt: row.generated_at as string,
    expiresAt: (row.expires_at as string) || "",
    source: (row.source as AdviceEntry["source"]) || "knowledge-base",
  };
}

function mapAdviceToDb(
  entry: Partial<AdviceEntry>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (entry.id !== undefined) row.id = entry.id;
  if (entry.category !== undefined) row.category = entry.category;
  if (entry.priority !== undefined) row.priority = entry.priority;
  if (entry.title !== undefined) row.title = entry.title;
  if (entry.body !== undefined) row.body = entry.body;
  if (entry.plantId !== undefined) row.plant_id = entry.plantId;
  if (entry.actionRequired !== undefined)
    row.action_required = entry.actionRequired;
  if (entry.dismissed !== undefined) row.dismissed = entry.dismissed;
  if (entry.generatedAt !== undefined) row.generated_at = entry.generatedAt;
  if (entry.expiresAt !== undefined) row.expires_at = entry.expiresAt;
  if (entry.source !== undefined) row.source = entry.source;
  return row;
}

function mapWeatherFromDb(row: Record<string, unknown>): WeatherSnapshot {
  return {
    date: row.date as string,
    tempMax: row.temp_max as number,
    tempMin: row.temp_min as number,
    tempCurrent: row.temp_current as number,
    precipitation: row.precipitation as number,
    humidity: row.humidity as number,
    windSpeed: row.wind_speed as number,
    uvIndex: row.uv_index as number,
    soilTemp10cm: row.soil_temp_10cm as number,
    soilMoisture: row.soil_moisture as number,
    sunrise: row.sunrise as string,
    sunset: row.sunset as string,
    condition: row.condition as WeatherSnapshot["condition"],
    frostRisk: (row.frost_risk as boolean) || false,
  };
}

function mapSpaceFromDb(row: Record<string, unknown>): Space {
  return {
    id: row.id as string,
    name: (row.name as string) || "New Space",
    type: (row.type as Space["type"]) || "greenhouse",
    description: (row.description as string) || "",
    backgroundImageUrl: (row.background_image_url as string) || "",
    width: (row.width as number) || 100,
    height: (row.height as number) || 60,
    plantPositions:
      (row.plant_positions as Space["plantPositions"]) || [],
  };
}

function mapSpaceToDb(
  space: Partial<Space>,
  gardenId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = { garden_id: gardenId };
  if (space.name !== undefined) row.name = space.name;
  if (space.type !== undefined) row.type = space.type;
  if (space.description !== undefined) row.description = space.description;
  if (space.backgroundImageUrl !== undefined)
    row.background_image_url = space.backgroundImageUrl;
  if (space.width !== undefined) row.width = space.width;
  if (space.height !== undefined) row.height = space.height;
  if (space.plantPositions !== undefined)
    row.plant_positions = space.plantPositions;
  return row;
}

// ============================================
// QUERY FUNCTIONS
// ============================================

// --- Plants ---

export async function getPlants(
  supabase: SupabaseClient,
  gardenId: string
): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapPlantFromDb);
}

export async function createPlant(
  supabase: SupabaseClient,
  gardenId: string,
  plant: Partial<Plant>
): Promise<Plant> {
  const slug =
    plant.slug ||
    (plant.commonName || "plant")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const row = mapPlantToDb({ ...plant, slug }, gardenId);
  const { data, error } = await supabase
    .from("plants")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapPlantFromDb(data);
}

export async function updatePlant(
  supabase: SupabaseClient,
  plantId: string,
  updates: Partial<Plant>
): Promise<Plant> {
  const row: Record<string, unknown> = {};
  if (updates.commonName !== undefined) row.common_name = updates.commonName;
  if (updates.variety !== undefined) row.variety = updates.variety;
  if (updates.latinName !== undefined) row.latin_name = updates.latinName;
  if (updates.confidence !== undefined) row.confidence = updates.confidence;
  if (updates.sowDate !== undefined) row.sow_date = updates.sowDate;
  if (updates.location !== undefined) row.location = updates.location;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.seedSource !== undefined) row.seed_source = updates.seedSource;
  if (updates.slug !== undefined) row.slug = updates.slug;
  row.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("plants")
    .update(row)
    .eq("id", plantId)
    .select()
    .single();

  if (error) throw error;
  return mapPlantFromDb(data);
}

export async function deletePlant(
  supabase: SupabaseClient,
  plantId: string
): Promise<void> {
  const { error } = await supabase.from("plants").delete().eq("id", plantId);
  if (error) throw error;
}

// --- Logs ---

export async function getLogs(
  supabase: SupabaseClient,
  gardenId: string,
  filters?: { plantId?: string; unlabeled?: boolean }
): Promise<LogEntry[]> {
  let query = supabase
    .from("log_entries")
    .select("*")
    .eq("garden_id", gardenId)
    .order("date", { ascending: false });

  if (filters?.plantId) query = query.eq("plant_id", filters.plantId);
  if (filters?.unlabeled) query = query.eq("labeled", false);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapLogFromDb);
}

export async function createLog(
  supabase: SupabaseClient,
  gardenId: string,
  log: Partial<LogEntry>
): Promise<LogEntry> {
  const row = mapLogToDb(log, gardenId);
  const { data, error } = await supabase
    .from("log_entries")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapLogFromDb(data);
}

export async function createLogsBatch(
  supabase: SupabaseClient,
  gardenId: string,
  logs: Partial<LogEntry>[]
): Promise<LogEntry[]> {
  const rows = logs.map((l) => mapLogToDb(l, gardenId));
  const { data, error } = await supabase
    .from("log_entries")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []).map(mapLogFromDb);
}

export async function updateLog(
  supabase: SupabaseClient,
  logId: string,
  updates: Partial<LogEntry>
): Promise<LogEntry> {
  const row: Record<string, unknown> = {};
  if (updates.plantId !== undefined) row.plant_id = updates.plantId || null;
  if (updates.caption !== undefined) row.caption = updates.caption;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.labeled !== undefined) row.labeled = updates.labeled;
  if (updates.cloudinaryUrl !== undefined)
    row.cloudinary_url = updates.cloudinaryUrl;

  const { data, error } = await supabase
    .from("log_entries")
    .update(row)
    .eq("id", logId)
    .select()
    .single();

  if (error) throw error;
  return mapLogFromDb(data);
}

export async function deleteLog(
  supabase: SupabaseClient,
  logId: string
): Promise<void> {
  const { error } = await supabase.from("log_entries").delete().eq("id", logId);
  if (error) throw error;
}

// --- Growth ---

export async function getGrowth(
  supabase: SupabaseClient,
  gardenId: string,
  plantId?: string
): Promise<GrowthEntry[]> {
  let query = supabase
    .from("growth_entries")
    .select("*")
    .eq("garden_id", gardenId)
    .order("date", { ascending: true });

  if (plantId) query = query.eq("plant_id", plantId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapGrowthFromDb);
}

export async function createGrowth(
  supabase: SupabaseClient,
  gardenId: string,
  entry: Partial<GrowthEntry>
): Promise<GrowthEntry> {
  const row = mapGrowthToDb(entry, gardenId);
  const { data, error } = await supabase
    .from("growth_entries")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapGrowthFromDb(data);
}

// --- Care Events ---

export async function getCareEvents(
  supabase: SupabaseClient,
  gardenId: string,
  plantId?: string
): Promise<CareEvent[]> {
  let query = supabase
    .from("care_events")
    .select("*")
    .eq("garden_id", gardenId)
    .order("date", { ascending: false });

  if (plantId) query = query.eq("plant_id", plantId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCareFromDb);
}

export async function createCareEvent(
  supabase: SupabaseClient,
  gardenId: string,
  event: Partial<CareEvent>
): Promise<CareEvent> {
  const row = mapCareToDb(event, gardenId);
  const { data, error } = await supabase
    .from("care_events")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapCareFromDb(data);
}

// --- Soil Readings ---

export async function getSoilReadings(
  supabase: SupabaseClient,
  gardenId: string,
  plantId?: string
): Promise<SoilReading[]> {
  let query = supabase
    .from("soil_readings")
    .select("*")
    .eq("garden_id", gardenId)
    .order("date", { ascending: false });

  if (plantId) query = query.eq("plant_id", plantId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapSoilFromDb);
}

export async function createSoilReading(
  supabase: SupabaseClient,
  gardenId: string,
  reading: Partial<SoilReading>
): Promise<SoilReading> {
  const row = mapSoilToDb(reading, gardenId);
  const { data, error } = await supabase
    .from("soil_readings")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapSoilFromDb(data);
}

// --- Advice ---

export async function getAdvice(
  supabase: SupabaseClient,
  gardenId: string
): Promise<AdviceEntry[]> {
  const { data, error } = await supabase
    .from("advice_entries")
    .select("*")
    .eq("garden_id", gardenId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAdviceFromDb);
}

export async function saveAdvice(
  supabase: SupabaseClient,
  gardenId: string,
  advice: AdviceEntry[]
): Promise<void> {
  // Delete old advice for this garden, then insert new
  await supabase.from("advice_entries").delete().eq("garden_id", gardenId);

  if (advice.length > 0) {
    const rows = advice.map((a) => mapAdviceToDb(a, gardenId));
    const { error } = await supabase.from("advice_entries").insert(rows);
    if (error) throw error;
  }
}

// --- Weather Cache ---

export async function getWeatherCache(
  supabase: SupabaseClient,
  gardenId: string
): Promise<WeatherSnapshot[]> {
  const { data, error } = await supabase
    .from("weather_cache")
    .select("*")
    .eq("garden_id", gardenId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapWeatherFromDb);
}

export async function saveWeatherCache(
  supabase: SupabaseClient,
  gardenId: string,
  snapshots: WeatherSnapshot[]
): Promise<void> {
  await supabase.from("weather_cache").delete().eq("garden_id", gardenId);

  if (snapshots.length > 0) {
    const rows = snapshots.map((s) => ({
      garden_id: gardenId,
      date: s.date,
      temp_max: s.tempMax,
      temp_min: s.tempMin,
      temp_current: s.tempCurrent,
      precipitation: s.precipitation,
      humidity: s.humidity,
      wind_speed: s.windSpeed,
      uv_index: s.uvIndex,
      soil_temp_10cm: s.soilTemp10cm,
      soil_moisture: s.soilMoisture,
      sunrise: s.sunrise,
      sunset: s.sunset,
      condition: s.condition,
      frost_risk: s.frostRisk,
    }));
    const { error } = await supabase.from("weather_cache").insert(rows);
    if (error) throw error;
  }
}

// --- Spaces ---

export async function getSpaces(
  supabase: SupabaseClient,
  gardenId: string
): Promise<Space[]> {
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapSpaceFromDb);
}

export async function createSpace(
  supabase: SupabaseClient,
  gardenId: string,
  space: Partial<Space>
): Promise<Space> {
  const row = mapSpaceToDb(space, gardenId);
  const { data, error } = await supabase
    .from("spaces")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapSpaceFromDb(data);
}

export async function updateSpace(
  supabase: SupabaseClient,
  spaceId: string,
  updates: Partial<Space>
): Promise<Space> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.backgroundImageUrl !== undefined)
    row.background_image_url = updates.backgroundImageUrl;
  if (updates.width !== undefined) row.width = updates.width;
  if (updates.height !== undefined) row.height = updates.height;
  if (updates.plantPositions !== undefined)
    row.plant_positions = updates.plantPositions;

  const { data, error } = await supabase
    .from("spaces")
    .update(row)
    .eq("id", spaceId)
    .select()
    .single();

  if (error) throw error;
  return mapSpaceFromDb(data);
}
