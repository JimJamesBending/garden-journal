export interface Plant {
  id: string;
  slug: string;
  commonName: string;
  variety: string;
  latinName: string;
  confidence: "confirmed" | "partial";
  sowDate: string;
  location: "indoor" | "outdoor";
  category: "fruit" | "vegetable" | "herb" | "flower";
  notes: string;
  seedSource: string;
}

export interface LogEntry {
  id: string;
  plantId: string;
  date: string;
  cloudinaryUrl: string;
  caption: string;
  status: PlantStatus;
  labeled: boolean;
}

export interface GrowthEntry {
  id: string;
  plantId: string;
  date: string;
  heightCm: number | null;
  leafCount: number | null;
  healthScore: number | null;
  notes: string;
}

export type PlantStatus =
  | "sowed"
  | "germinated"
  | "transplanted"
  | "flowering"
  | "harvested";

// --- V2 Types ---

export interface CareEvent {
  id: string;
  plantId: string;
  type: CareEventType;
  date: string;
  notes: string;
  quantity: string;
}

export type CareEventType =
  | "watered"
  | "fed"
  | "pruned"
  | "repotted"
  | "treated"
  | "harvested"
  | "observed";

export interface SoilReading {
  id: string;
  plantId: string;
  date: string;
  ph: number | null;
  nitrogen: "low" | "medium" | "high" | null;
  phosphorus: "low" | "medium" | "high" | null;
  potassium: "low" | "medium" | "high" | null;
  moisture: "dry" | "moist" | "wet" | null;
  notes: string;
}

export interface AdviceEntry {
  id: string;
  category: AdviceCategory;
  priority: AdvicePriority;
  title: string;
  body: string;
  plantId: string;
  actionRequired: boolean;
  dismissed: boolean;
  generatedAt: string;
  expiresAt: string;
  source: AdviceSource;
}

export type AdviceCategory =
  | "this-week"
  | "coming-up"
  | "seasonal"
  | "weather-alert"
  | "growth-update"
  | "problem"
  | "harvest"
  | "buy-list"
  | "fun-fact";

export type AdvicePriority =
  | "urgent"
  | "high"
  | "medium"
  | "low"
  | "info";

export type AdviceSource =
  | "knowledge-base"
  | "weather-api"
  | "photo-analysis"
  | "growth-data";

export interface WeatherSnapshot {
  date: string;
  tempMax: number;
  tempMin: number;
  tempCurrent: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  soilTemp10cm: number;
  soilMoisture: number;
  sunrise: string;
  sunset: string;
  condition: WeatherCondition;
  frostRisk: boolean;
}

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "heavy-rain"
  | "drizzle"
  | "snow"
  | "fog"
  | "thunderstorm";

export interface WeatherForecast {
  current: WeatherSnapshot;
  daily: WeatherSnapshot[];
}

// Plant knowledge base types
export interface PlantCareProfile {
  commonName: string;
  latinName: string;
  category: string;
  ukHardinessZone: string;
  lifecycle: string;
  sowIndoors: SowWindow | null;
  sowOutdoors: SowWindow | null;
  plantOut: SowWindow | null;
  floweringPeriod: SeasonRange | null;
  harvestPeriod: SeasonRange | null;
  daysToGermination: MinMax | null;
  daysToHarvest?: MinMax | null;
  daysToFlower?: MinMax | null;
  idealTemp: { min: number; max: number; unit: string };
  soilPH: { min: number; max: number };
  wateringNeeds: string;
  wateringNotes: string;
  feedingSchedule: string;
  sunRequirement: string;
  spacing: string;
  supportRequired: boolean;
  supportType: string | null;
  pinchOutAt?: string;
  companionPlants: string[];
  badCompanions: string[];
  commonProblems: PlantProblem[];
  harvestTips: string;
  repottingTrigger: string | null;
  repottingSize: string | null;
  monthlyTasks: Record<string, string>;
}

export interface SowWindow {
  earliest: string;
  ideal: string;
  latest: string;
}

export interface SeasonRange {
  start: string;
  end: string;
}

export interface MinMax {
  min: number;
  max: number;
}

export interface PlantProblem {
  problem: string;
  symptoms: string;
  cause: string;
  treatment: string;
}

// --- V3 Types: Spaces ---

export type SpaceType =
  | "greenhouse"
  | "cold-frame"
  | "windowsill"
  | "raised-bed"
  | "polytunnel"
  | "shelf"
  | "garden-bed";

export interface PlantPosition {
  plantId: string;
  x: number;       // % position within the space (0-100)
  y: number;       // % position within the space (0-100)
  label?: string;   // e.g. "Top shelf, left"
}

export interface Space {
  id: string;
  name: string;                 // "Main Greenhouse", "Kitchen Windowsill"
  type: SpaceType;
  description: string;
  backgroundImageUrl: string;   // Photo of the actual space
  width: number;                // Relative grid units
  height: number;
  plantPositions: PlantPosition[];
}

// --- V3 Types: SaaS Skeleton ---

export interface User {
  id: string;
  email: string;
  name: string;
  plan: SubscriptionPlan;
  gardenId: string;
}

export type SubscriptionPlan = "free" | "grower" | "pro";

export interface Garden {
  id: string;
  ownerId: string;
  name: string;
  location: { lat: number; lng: number };
  spaces: Space[];
}

export interface Subscription {
  plan: SubscriptionPlan;
  features: string[];
  priceMonthly: number;
  stripePriceId: string;
}

// --- V3 Types: Plant Identification ---

export interface PlantIdResult {
  species: string;
  commonName: string;
  confidence: number;
  family: string;
  genus: string;
  imageUrl?: string;
}

export interface PlantIdResponse {
  results: PlantIdResult[];
  query: {
    images: string[];
    organ: string;
  };
}
