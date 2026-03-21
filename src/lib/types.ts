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

// Top-level space types (the physical space)
export type SpaceType =
  | "greenhouse"
  | "shed"
  | "windowsill"
  | "raised-bed"
  | "cold-frame"
  | "polytunnel"
  | "garden-bed"
  | "patio"
  | "balcony"
  | "allotment"
  | "front-garden"
  | "back-garden"
  | "conservatory"
  | "porch"
  | "garage";

// Subtypes — positions/features WITHIN a space
export type SpaceSubtype =
  | "shelf"
  | "ledge"
  | "bench"
  | "hanging"
  | "floor"
  | "staging"
  | "propagator"
  | "growbag"
  | "pot"
  | "trough"
  | "wall-mounted"
  | "trellis"
  | "border"
  | "path-edge"
  | "corner";

// Complete space hierarchy definition
export const SPACE_HIERARCHY: Record<SpaceType, { label: string; icon: string; subtypes: SpaceSubtype[] }> = {
  greenhouse: {
    label: "Greenhouse",
    icon: "🌿",
    subtypes: ["shelf", "bench", "staging", "floor", "hanging", "propagator", "growbag"],
  },
  shed: {
    label: "Shed",
    icon: "🛖",
    subtypes: ["shelf", "bench", "floor", "hanging", "wall-mounted"],
  },
  windowsill: {
    label: "Windowsill",
    icon: "🪟",
    subtypes: ["ledge", "shelf", "propagator", "pot", "trough"],
  },
  "raised-bed": {
    label: "Raised Bed",
    icon: "🌾",
    subtypes: ["border", "path-edge", "corner", "trellis"],
  },
  "cold-frame": {
    label: "Cold Frame",
    icon: "🧊",
    subtypes: ["shelf", "floor", "propagator"],
  },
  polytunnel: {
    label: "Polytunnel",
    icon: "⛺",
    subtypes: ["bench", "staging", "floor", "growbag", "hanging"],
  },
  "garden-bed": {
    label: "Garden Bed",
    icon: "💐",
    subtypes: ["border", "path-edge", "corner", "trellis"],
  },
  patio: {
    label: "Patio",
    icon: "☀️",
    subtypes: ["pot", "trough", "hanging", "wall-mounted", "floor", "corner"],
  },
  balcony: {
    label: "Balcony",
    icon: "🏗️",
    subtypes: ["pot", "trough", "hanging", "wall-mounted", "shelf", "floor", "corner"],
  },
  allotment: {
    label: "Allotment",
    icon: "🧑‍🌾",
    subtypes: ["border", "path-edge", "growbag", "trellis"],
  },
  "front-garden": {
    label: "Front Garden",
    icon: "🏡",
    subtypes: ["border", "pot", "hanging", "wall-mounted", "path-edge", "trellis"],
  },
  "back-garden": {
    label: "Back Garden",
    icon: "🏠",
    subtypes: ["border", "pot", "hanging", "wall-mounted", "path-edge", "trellis", "corner"],
  },
  conservatory: {
    label: "Conservatory",
    icon: "🪴",
    subtypes: ["shelf", "ledge", "bench", "floor", "hanging", "pot"],
  },
  porch: {
    label: "Porch",
    icon: "🚪",
    subtypes: ["shelf", "ledge", "pot", "hanging", "floor"],
  },
  garage: {
    label: "Garage",
    icon: "🅿️",
    subtypes: ["shelf", "bench", "floor"],
  },
};

// Subtype labels and icons
export const SUBTYPE_INFO: Record<SpaceSubtype, { label: string; icon: string }> = {
  shelf: { label: "Shelf", icon: "📚" },
  ledge: { label: "Ledge", icon: "📏" },
  bench: { label: "Bench", icon: "🪑" },
  hanging: { label: "Hanging", icon: "🪝" },
  floor: { label: "Floor", icon: "⬇️" },
  staging: { label: "Staging", icon: "📐" },
  propagator: { label: "Propagator", icon: "🌱" },
  growbag: { label: "Growbag", icon: "🛍️" },
  pot: { label: "Pot", icon: "🪴" },
  trough: { label: "Trough", icon: "📦" },
  "wall-mounted": { label: "Wall-mounted", icon: "🧱" },
  trellis: { label: "Trellis", icon: "🪜" },
  border: { label: "Border", icon: "🌻" },
  "path-edge": { label: "Path Edge", icon: "🚶" },
  corner: { label: "Corner", icon: "📐" },
};

export interface PlantPosition {
  plantId: string;
  x: number;       // % position within the space (0-100)
  y: number;       // % position within the space (0-100)
  label?: string;   // e.g. "Top shelf, left"
  subtype?: SpaceSubtype;  // Where within the space
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

// --- V4 Types: Photo Wizard ---

export type PhotoCategory =
  | "plant"      // Close-up of a living plant
  | "label"      // Seed packet, plant label, price tag
  | "overview"   // Wide shot of garden bed / greenhouse
  | "soil"       // Soil, compost, empty growing medium
  | "unclear";   // Needs user help

export interface WizardPhoto {
  id: string;                              // Temp ID for wizard session
  cloudinaryUrl: string;                   // After upload
  thumbnailUrl: string;                    // Cloudinary thumb transform
  uploadProgress: number;                  // 0-100
  uploading: boolean;
  category: PhotoCategory | null;          // Set by AI sort
  categoryConfidence: number;              // 0-100
  userOverrideCategory: PhotoCategory | null;  // If user corrects AI
  ocrText: string | null;                 // For label photos
  plantIdResult: PlantIdResult | null;     // For plant photos
  aiNotes: string | null;                  // AI observations
}

export interface WizardQuestion {
  id: string;
  photoIds: string[];                      // Which photos this relates to
  questionText: string;                    // "Which plant is this?"
  type: "single-choice" | "multi-choice" | "text";
  options: WizardOption[];
  answer: string | null;                   // Selected option ID or free text
  skipped: boolean;
  required: boolean;
}

export interface WizardOption {
  id: string;
  label: string;
  icon?: string;                           // emoji
  sublabel?: string;                       // e.g. variety name
  thumbnailUrl?: string;                   // For plant matching
}

export type WizardStep = "photo" | "results" | "done";

export interface WizardAction {
  type: "create-plant" | "create-log" | "create-care" | "create-growth" | "assign-space" | "update-plant";
  data: Record<string, unknown>;
  description: string;                     // Human-readable: "Created new plant: Strawberry"
  plantName?: string;                      // For grouping in review
}

export interface WizardState {
  step: WizardStep;
  photos: WizardPhoto[];
  questions: WizardQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;         // questionId → answer
  actions: WizardAction[];                 // What the wizard will do / has done
  processing: boolean;
  processingMessage: string;
  error: string | null;
  complete: boolean;
  // New 3-step wizard fields
  identifying: boolean;                    // AI identification in progress
  identifiedName: string | null;           // AI-suggested plant name
  identifiedConfidence: number;            // 0-100 confidence
  identifiedCareTips: string | null;       // AI notes / care tips
  confirmedName: string | null;            // User-confirmed or typed plant name
  savedPlantName: string | null;           // Final saved name (for done step)
}

// API request/response types for wizard endpoints
export interface WizardSortRequest {
  photoUrls: string[];
  password: string;
}

export interface WizardSortResponse {
  results: Array<{
    url: string;
    category: PhotoCategory;
    confidence: number;
    ocrText: string | null;
    plantIdSuggestion: PlantIdResult | null;
    aiNotes: string | null;
  }>;
}

export interface WizardProcessRequest {
  actions: WizardAction[];
  password: string;
}

export interface WizardProcessResponse {
  created: {
    plants: number;
    logs: number;
    careEvents: number;
    growthEntries: number;
  };
  createdIds: {
    plants: string[];
    logs: string[];
  };
  errors: string[];
}

// --- Hazel WhatsApp Types ---

export interface Conversation {
  id: string;
  profileId: string;
  channel: "whatsapp" | "messenger" | "web";
  channelUserId: string;
  startedAt: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  mediaUrls: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface HazelResponse {
  text: string;
  identifiedPlants: IdentifiedPlant[];
  shouldSavePlants: boolean;
  detectedSpace: SpaceType | null;
  detectedSubtype: SpaceSubtype | null;
}

export interface IdentifiedPlant {
  commonName: string;
  latinName: string;
  confidence: number;
  category: "fruit" | "vegetable" | "herb" | "flower";
  variety: string;
  aiNotes: string;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: "text" | "image" | "audio" | "video" | "document" | "sticker" | "reaction" | "location" | "contacts" | "interactive" | "order" | "system";
        text?: { body: string };
        image?: { id: string; mime_type: string; caption?: string };
      }>;
    };
    field: string;
  }>;
}

export interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppWebhookEntry[];
}
