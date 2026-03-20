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
  sowed: "bg-earth-600/80 text-earth-200",
  germinated: "bg-moss-600/80 text-moss-100",
  transplanted: "bg-moss-500/80 text-moss-100",
  flowering: "bg-parchment-600/80 text-parchment-100",
  harvested: "bg-parchment-500/80 text-parchment-100",
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

  const statusStyle = STATUS_STYLES[latestStatus] || "bg-moss-700/80 text-moss-200";
  const days = daysSince(plant.sowDate);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(plant.id)}
      className="w-full text-left rounded-xl overflow-hidden border border-moss-700/30 hover:border-moss-600/40 transition-colors"
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
          <div className="w-full h-full bg-gradient-to-br from-moss-800 via-moss-850 to-moss-900 flex flex-col items-center justify-center gap-1.5">
            <span className="text-4xl opacity-20">
              {CATEGORY_ICONS[plant.category] || "\u{1F331}"}
            </span>
            <span className="font-mono text-[9px] text-moss-500 uppercase tracking-wider">
              Needs a photo!
            </span>
            <span className="text-sm opacity-25">{"\u{1F4F7}"}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-moss-950/80 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-block font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm ${statusStyle}`}>
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
            <span className="font-mono text-[9px] text-white/70 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              {"\u{1F4F7}"} {photoCount}
            </span>
          </div>
        )}

        {/* Plant name at bottom of photo */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h3 className="font-display text-base text-parchment-200 truncate">
            {plant.commonName}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="bg-moss-900/50 backdrop-blur-sm p-3">
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0">
            {plant.variety && (
              <p className="font-mono text-[9px] text-moss-400 truncate">
                {plant.variety}
              </p>
            )}
          </div>
          <span className="font-mono text-[9px] text-moss-500 whitespace-nowrap ml-2">
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
