"use client";

import { CareEvent } from "@/lib/types";

interface CareIndicatorsProps {
  lastWatered: CareEvent | null;
  lastFed: CareEvent | null;
  wateringNeeds?: string;
}

function daysSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getWaterStatus(
  lastWatered: CareEvent | null,
  wateringNeeds: string
): "good" | "due" | "overdue" | "none" {
  if (!lastWatered) return "none";
  const days = daysSince(lastWatered.date);

  const thresholds: Record<string, { due: number; overdue: number }> = {
    high: { due: 1, overdue: 3 },
    "moderate-high": { due: 2, overdue: 4 },
    moderate: { due: 3, overdue: 5 },
    "low-moderate": { due: 4, overdue: 7 },
    low: { due: 7, overdue: 14 },
  };

  const t = thresholds[wateringNeeds] || thresholds.moderate;
  if (days >= t.overdue) return "overdue";
  if (days >= t.due) return "due";
  return "good";
}

function getFeedStatus(lastFed: CareEvent | null): "good" | "due" | "overdue" | "none" {
  if (!lastFed) return "none";
  const days = daysSince(lastFed.date);
  if (days >= 21) return "overdue";
  if (days >= 14) return "due";
  return "good";
}

const STATUS_COLORS = {
  good: "bg-emerald-500",
  due: "bg-amber-500",
  overdue: "bg-red-500",
  none: "bg-gray-400",
};

export function CareIndicators({ lastWatered, lastFed, wateringNeeds = "moderate" }: CareIndicatorsProps) {
  const waterStatus = getWaterStatus(lastWatered, wateringNeeds);
  const feedStatus = getFeedStatus(lastFed);

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[waterStatus]} ${
            waterStatus === "overdue" ? "animate-pulse" : ""
          }`}
        />
        <span className="font-sans text-sm text-garden-textMuted">{"\u{1F4A7}"}</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[feedStatus]} ${
            feedStatus === "overdue" ? "animate-pulse" : ""
          }`}
        />
        <span className="font-sans text-sm text-garden-textMuted">{"\u{1F33F}"}</span>
      </div>
    </div>
  );
}
