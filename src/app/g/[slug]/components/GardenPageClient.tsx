"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { GardenData } from "../page";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { GardenHero } from "./GardenHero";
import { GardenNav } from "./GardenNav";
import { PlantGallery } from "./PlantGallery";
import { PlantDetailModal } from "./PlantDetailModal";
import { PhotoLightbox } from "./PhotoLightbox";
import { GardenSpaces } from "./GardenSpaces";
import { GardenTimeline } from "./GardenTimeline";
import { GardenTips } from "./GardenTips";
import { GardenFooter } from "./GardenFooter";

// --- Data transformers ---

function buildGalleryPlants(data: GardenData) {
  return data.plants.map((plant) => {
    const logs = data.logsByPlant[plant.id] || [];
    const latestLog = logs[0] || null;
    const photoCount = logs.filter((l) => l.cloudinary_url).length;

    return {
      id: plant.id,
      commonName: plant.common_name,
      latinName: plant.latin_name,
      category: plant.category,
      variety: plant.variety,
      notes: plant.notes,
      sowDate: plant.sow_date,
      location: plant.location,
      confidence: plant.confidence,
      createdAt: plant.created_at,
      photoUrl: latestLog?.cloudinary_url || null,
      photoCount,
      impactGrade: plant.impact?.impactGrade || null,
      status: latestLog?.status || null,
    };
  });
}

function buildPlantDetail(
  plantId: string,
  data: GardenData
) {
  const plant = data.plants.find((p) => p.id === plantId);
  if (!plant) return null;

  const logs = data.logsByPlant[plant.id] || [];
  const growth = data.growthByPlant[plant.id] || [];
  const care = data.careByPlant[plant.id] || [];

  const photos = logs
    .filter((l) => l.cloudinary_url)
    .map((l) => ({
      url: l.cloudinary_url!,
      caption: l.caption || "",
      date: l.date,
      status: l.status,
    }));

  const growthData = growth.map((g) => ({
    date: g.date,
    heightCm: g.height_cm,
    leafCount: g.leaf_count,
    healthScore: g.health_score,
  }));

  const careEvents = care.map((c) => ({
    type: c.type,
    date: c.date,
    notes: c.notes || "",
  }));

  // Build care profile for display
  const cp = plant.careProfile;
  const careProfile = cp
    ? {
        wateringNeeds: cp.wateringNeeds || "Unknown",
        sunlight: cp.sunRequirement || "Unknown",
        soilPh: cp.soilPH
          ? `${cp.soilPH.min} - ${cp.soilPH.max}`
          : "Unknown",
        feedingSchedule: cp.feedingSchedule || "Unknown",
        commonProblems: cp.commonProblems?.map((p) => p.problem) || [],
        harvestInfo: cp.harvestTips || undefined,
      }
    : null;

  // Build impact for display
  const imp = plant.impact;
  const impact = imp
    ? {
        impactGrade: imp.impactGrade,
        beesPerSeason: imp.beesPerSeason,
        butterfliesPerSeason: imp.butterfliesPerSeason,
        oxygenMlPerHour: imp.oxygenMlPerHour,
        primaryStats: imp.primaryStats.map((s) => ({
          emoji: s.emoji,
          label: s.label,
          value: s.value,
          maxValue: s.maxValue,
        })),
      }
    : null;

  const harvestEstimate = plant.harvestEstimate
    ? {
        estimated: plant.harvestEstimate.estimated,
        daysRemaining: plant.harvestEstimate.daysRemaining,
      }
    : null;

  const monthlyTask = plant.monthlyTask || null;

  const companionAdvice = plant.companionAdvice
    ? {
        good: plant.companionAdvice.good,
        bad: plant.companionAdvice.bad,
      }
    : null;

  return {
    id: plant.id,
    commonName: plant.common_name,
    latinName: plant.latin_name,
    category: plant.category,
    variety: plant.variety,
    notes: plant.notes,
    sowDate: plant.sow_date,
    location: plant.location,
    confidence: plant.confidence,
    createdAt: plant.created_at,
    photos,
    growthData,
    careEvents,
    careProfile,
    impact,
    harvestEstimate,
    monthlyTask,
    companionAdvice,
  };
}

function buildMonthlyTasks(data: GardenData) {
  return data.plants
    .filter((p) => p.monthlyTask)
    .map((p) => ({
      plantName: p.common_name,
      task: p.monthlyTask!,
    }));
}

function buildHarvestPredictions(data: GardenData) {
  return data.plants
    .filter((p) => p.harvestEstimate)
    .map((p) => ({
      plantName: p.common_name,
      daysRemaining: p.harvestEstimate!.daysRemaining,
      estimatedDate: new Date(
        p.harvestEstimate!.estimated
      ).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      }),
    }));
}

// --- Component ---

interface GardenPageClientProps {
  data: GardenData;
}

export function GardenPageClient({ data }: GardenPageClientProps) {
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption?: string;
    date?: string;
    photos: Array<{ url: string; caption: string; date: string }>;
    index: number;
  } | null>(null);

  // Gallery plants (transformed for PlantGallery props)
  const galleryPlants = buildGalleryPlants(data);

  // Plant click → open detail modal
  const handlePlantClick = useCallback((plantId: string) => {
    setSelectedPlantId(plantId);
  }, []);

  // Close detail modal
  const handleCloseDetail = useCallback(() => {
    setSelectedPlantId(null);
  }, []);

  // Photo click from detail modal → open lightbox
  const handlePhotoClick = useCallback(
    (url: string, index: number) => {
      if (!selectedPlantId) return;
      const detail = buildPlantDetail(selectedPlantId, data);
      if (!detail) return;

      setLightbox({
        url,
        caption: detail.photos[index]?.caption,
        date: detail.photos[index]?.date,
        photos: detail.photos,
        index,
      });
    },
    [selectedPlantId, data]
  );

  // Lightbox navigation
  const handleLightboxPrev = useCallback(() => {
    if (!lightbox || lightbox.index <= 0) return;
    const newIndex = lightbox.index - 1;
    const photo = lightbox.photos[newIndex];
    setLightbox({
      ...lightbox,
      url: photo.url,
      caption: photo.caption,
      date: photo.date,
      index: newIndex,
    });
  }, [lightbox]);

  const handleLightboxNext = useCallback(() => {
    if (!lightbox || lightbox.index >= lightbox.photos.length - 1) return;
    const newIndex = lightbox.index + 1;
    const photo = lightbox.photos[newIndex];
    setLightbox({
      ...lightbox,
      url: photo.url,
      caption: photo.caption,
      date: photo.date,
      index: newIndex,
    });
  }, [lightbox]);

  // Build detail data for selected plant
  const selectedDetail = selectedPlantId
    ? buildPlantDetail(selectedPlantId, data)
    : null;

  // Monthly tasks and harvest predictions for tips
  const monthlyTasks = buildMonthlyTasks(data);
  const harvestPredictions = buildHarvestPredictions(data);

  // Check if we have spaces with plant positions
  const hasSpaces =
    data.spaces.length > 0 &&
    data.spaces.some((s) => s.plant_positions && s.plant_positions.length > 0);

  // Check if we have tips content
  const hasTips =
    monthlyTasks.length > 0 || harvestPredictions.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <ScrollProgress />

      {/* Hero */}
      <GardenHero
        gardenName={data.gardenName}
        ownerName={data.ownerName}
        plantCount={data.plantCount}
        spaceCount={data.spaceCount}
        photoCount={data.photoCount}
        heroPhotoUrl={data.heroPhotoUrl}
        season={data.season}
        seasonEmoji={data.seasonEmoji}
      />

      {/* Sticky nav */}
      <GardenNav
        hasSpaces={hasSpaces}
        hasTimeline={data.activityFeed.length > 0}
        hasTips={hasTips}
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6">
        {/* Plants section */}
        <div id="plants">
          <PlantGallery
            plants={galleryPlants}
            onPlantClick={handlePlantClick}
          />
        </div>
      </main>

      {/* Spaces section */}
      {hasSpaces && (
        <div id="spaces">
          <GardenSpaces
            spaces={data.spaces}
            plants={data.plants}
            logsByPlant={data.logsByPlant}
            onPlantClick={handlePlantClick}
          />
        </div>
      )}

      {/* Timeline section */}
      {data.activityFeed.length > 0 && (
        <div id="timeline" className="max-w-6xl mx-auto px-6">
          <GardenTimeline events={data.activityFeed} />
        </div>
      )}

      {/* Tips section */}
      {hasTips && (
        <div id="tips">
          <GardenTips
            monthlyTasks={monthlyTasks}
            harvestPredictions={harvestPredictions}
            season={data.season}
            seasonEmoji={data.seasonEmoji}
          />
        </div>
      )}

      {/* Footer */}
      <GardenFooter whatsappLink={data.whatsappLink} />

      {/* Detail modal */}
      <AnimatePresence>
        {selectedDetail && (
          <PlantDetailModal
            key={selectedDetail.id}
            plant={selectedDetail}
            onClose={handleCloseDetail}
            onPhotoClick={handlePhotoClick}
          />
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {lightbox && (
        <PhotoLightbox
          url={lightbox.url}
          caption={lightbox.caption}
          date={lightbox.date}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.index > 0 ? handleLightboxPrev : undefined}
          onNext={
            lightbox.index < lightbox.photos.length - 1
              ? handleLightboxNext
              : undefined
          }
        />
      )}
    </div>
  );
}
