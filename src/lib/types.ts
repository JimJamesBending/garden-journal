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
  status: "sowed" | "germinated" | "transplanted" | "flowering" | "harvested";
}

export type PlantStatus =
  | "sowed"
  | "germinated"
  | "transplanted"
  | "flowering"
  | "harvested";
