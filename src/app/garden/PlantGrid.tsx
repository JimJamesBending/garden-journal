"use client";

import { Plant, LogEntry, GrowthEntry, CareEvent } from "@/lib/types";
import { getCareProfile } from "@/lib/plant-care";
import { PlantCard } from "./PlantCard";

interface PlantGridProps {
  plants: Plant[];
  logs: LogEntry[];
  growth: GrowthEntry[];
  care: CareEvent[];
  onSelectPlant: (plantId: string) => void;
}

export function PlantGrid({ plants, logs, growth, care, onSelectPlant }: PlantGridProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-parchment-200">
          Your Garden
        </h2>
        <span className="font-mono text-[10px] text-moss-500">
          {plants.length} plants
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {plants.map((plant, i) => {
          // Derive per-plant data
          const plantLogs = logs
            .filter((l) => l.plantId === plant.id && l.labeled && l.cloudinaryUrl)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const latestPhoto = plantLogs[0] || null;
          const latestStatus = plantLogs[0]?.status || "sowed";
          const photoCount = plantLogs.length;

          const plantGrowth = growth
            .filter((g) => g.plantId === plant.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const plantCare = care.filter((e) => e.plantId === plant.id);
          const lastWatered = plantCare
            .filter((e) => e.type === "watered")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
          const lastFed = plantCare
            .filter((e) => e.type === "fed")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

          const careProfile = getCareProfile(plant.id);
          const wateringNeeds = careProfile?.wateringNeeds || "moderate";

          return (
            <PlantCard
              key={plant.id}
              plant={plant}
              latestPhoto={latestPhoto}
              latestStatus={latestStatus}
              growthData={plantGrowth}
              lastWatered={lastWatered}
              lastFed={lastFed}
              wateringNeeds={wateringNeeds}
              photoCount={photoCount}
              onSelect={onSelectPlant}
              index={i}
            />
          );
        })}
      </div>
    </div>
  );
}
