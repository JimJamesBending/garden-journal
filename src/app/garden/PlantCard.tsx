"use client";

import { motion } from "framer-motion";
import { Plant, LogEntry, GrowthEntry, CareEvent } from "@/lib/types";
import { heroImage, cardBackground } from "@/lib/cloudinary";
import { GrowthSparkline } from "./GrowthSparkline";
import { CareIndicators } from "./CareIndicators";

interface PlantCardProps {
  plant: Plant;
  latestPhoto: LogEntry | null;
  latestStatus: string;
  growthData: GrowthEntry[];
  lastWatered: CareEvent | null;
  lastFed: CareEvent | null;
  wateringNeeds: string;
  photoCount: number;
  onSelect: (plantId: string) => void;
  index: number;
}

const STATUS_STYLES: Record<string, string> = {
  sowed: "bg-amber-100 text-amber-800",
  germinated: "bg-garden-greenLight text-garden-green",
  transplanted: "bg-green-100 text-green-800",
  flowering: "bg-pink-100 text-pink-800",
  harvested: "bg-orange-100 text-orange-800",
};

const CATEGORY_ICONS: Record<string, string> = {
  fruit: "\u{1F353}",
  vegetable: "\u{1F966}",
  herb: "\u{1F33F}",
  flower: "\u{1F33A}",
};

function daysSince(date: string): number {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function PlantCard({
  plant,
  latestPhoto,
  latestStatus,
  growthData,
  lastWatered,
  lastFed,
  wateringNeeds,
  photoCount,
  onSelect,
  index,
}: PlantCardProps) {
  const sparklineData = growthData
    .filter((g) => g.heightCm !== null)
    .map((g) => ({ date: g.date, height: g.heightCm as number }));

  const statusStyle = STATUS_STYLES[latestStatus] || "bg-gray-100 text-gray-700";
  const days = daysSince(plant.sowDate);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(plant.id)}
      className="w-full text-left rounded-xl overflow-hidden border border-garden-border hover:border-garden-greenBright transition-colors"
    >
      {/* Hero photo with blurred background */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {latestPhoto ? (
          <>
            {/* Blurred background fill — ensures full coverage */}
            <img
              src={cardBackground(latestPhoto.cloudinaryUrl)}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110"
            />
            {/* Sharp foreground photo */}
            <img
              src={heroImage(latestPhoto.cloudinaryUrl)}
              alt={plant.commonName}
              className="relative w-full h-full object-cover"
              loading="lazy"
            />
          </>
        ) : (
          /* Illustrated "needs a photo" fallback */
          <div className="w-full h-full bg-garden-greenLight flex flex-col items-center justify-center gap-1.5">
            <span className="text-4xl opacity-40">
              {CATEGORY_ICONS[plant.category] || "\u{1F331}"}
            </span>
            <span className="font-sans text-sm text-garden-textMuted uppercase tracking-wider">
              Needs a photo!
            </span>
            <span className="text-sm opacity-25">{"\u{1F4F7}"}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-block font-sans text-sm uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm ${statusStyle}`}>
            {latestStatus === "flowering" && (
              <motion.span
                className="inline-block mr-0.5"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {"\u2022"}
              </motion.span>
            )}
            {latestStatus}
          </span>
        </div>

        {/* Photo count */}
        {photoCount > 0 && (
          <div className="absolute top-2 right-2">
            <span className="font-sans text-sm text-white/90 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              {"\u{1F4F7}"} {photoCount}
            </span>
          </div>
        )}

        {/* Plant name at bottom of photo */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h3 className="font-sans font-bold text-base text-white truncate">
            {plant.commonName}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-3">
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0">
            {plant.variety && (
              <p className="font-sans text-sm text-garden-textMuted truncate">
                {plant.variety}
              </p>
            )}
          </div>
          <span className="font-sans text-sm text-garden-textMuted whitespace-nowrap ml-2">
            {days}d
          </span>
        </div>

        {/* Growth sparkline */}
        <div className="my-2">
          <GrowthSparkline data={sparklineData} />
        </div>

        {/* Care indicators */}
        <CareIndicators
          lastWatered={lastWatered}
          lastFed={lastFed}
          wateringNeeds={wateringNeeds}
        />
      </div>
    </motion.button>
  );
}
