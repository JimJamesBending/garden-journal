"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { heroImage } from "@/lib/cloudinary";
import { GrowthChart } from "@/app/garden/GrowthChart";

// --- Types ---

interface PlantDetailData {
  id: string;
  commonName: string;
  latinName: string | null;
  category: string | null;
  variety: string | null;
  notes: string | null;
  sowDate: string | null;
  location: string | null;
  confidence: string | null;
  createdAt: string | null;
  photos: Array<{
    url: string;
    caption: string;
    date: string;
    status: string | null;
  }>;
  growthData: Array<{
    date: string;
    heightCm: number | null;
    leafCount: number | null;
    healthScore: number | null;
  }>;
  careEvents: Array<{ type: string; date: string; notes: string }>;
  careProfile: {
    wateringNeeds: string;
    sunlight: string;
    soilPh: string;
    feedingSchedule: string;
    commonProblems: string[];
    harvestInfo?: string;
  } | null;
  impact: {
    impactGrade: string;
    beesPerSeason: number;
    butterfliesPerSeason: number;
    oxygenMlPerHour: number;
    primaryStats: Array<{
      emoji: string;
      label: string;
      value: number;
      maxValue: number;
    }>;
  } | null;
  harvestEstimate: { estimated: string; daysRemaining: number } | null;
  monthlyTask: string | null;
  companionAdvice: { good: string[]; bad: string[] } | null;
}

interface PlantDetailModalProps {
  plant: PlantDetailData;
  onClose: () => void;
  onPhotoClick: (url: string, index: number) => void;
}

// --- Helpers ---

function getCategoryEmoji(category: string | null): string {
  const emojis: Record<string, string> = {
    flower: "\u{1F33A}",
    vegetable: "\u{1F966}",
    herb: "\u{1F33F}",
    fruit: "\u{1F353}",
  };
  return emojis[category || ""] || "\u{1F331}";
}

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-garden-green text-white";
  if (grade.startsWith("B")) return "bg-garden-greenBright text-white";
  if (grade.startsWith("C")) return "bg-garden-amber text-white";
  return "bg-garden-textMuted text-white";
}

function daysBetween(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getCareIcon(type: string): string {
  const icons: Record<string, string> = {
    watered: "\u{1F4A7}",
    fed: "\u{1F33E}",
    pruned: "\u2702\uFE0F",
    repotted: "\u{1FAB4}",
    treated: "\u{1F48A}",
    harvested: "\u{1F33D}",
    observed: "\u{1F440}",
    planted: "\u{1F331}",
  };
  return icons[type] || "\u{1F4CB}";
}

// --- Collapsible Section ---

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-garden-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-garden-offwhite hover:bg-garden-cream transition-colors"
      >
        <span className="font-sans font-semibold text-body text-garden-text">
          {title}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-garden-textMuted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 8 10 12 14 8" />
        </svg>
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

// --- Component ---

export function PlantDetailModal({
  plant,
  onClose,
  onPhotoClick,
}: PlantDetailModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Track carousel scroll for dot indicators
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || plant.photos.length === 0) return;

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const itemWidth = el.clientWidth;
      const index = Math.round(scrollLeft / itemWidth);
      setActivePhotoIndex(Math.min(index, plant.photos.length - 1));
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [plant.photos.length]);

  // Computed values
  const daysGrowing = plant.sowDate
    ? daysBetween(plant.sowDate)
    : plant.createdAt
      ? daysBetween(plant.createdAt)
      : null;

  const isVegetableOrFruit =
    plant.category === "vegetable" || plant.category === "fruit";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 bg-white"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-garden-offwhite hover:bg-garden-border transition-colors"
          aria-label="Close detail view"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-garden-text"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div ref={scrollRef} className="h-full overflow-y-auto">
          {/* ---- Photo Carousel ---- */}
          {plant.photos.length > 0 ? (
            <div className="relative">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {plant.photos.map((photo, i) => (
                  <div
                    key={i}
                    className="flex-none w-full snap-center"
                    onClick={() => onPhotoClick(photo.url, i)}
                  >
                    <img
                      src={heroImage(photo.url)}
                      alt={photo.caption || plant.commonName}
                      className="w-full h-64 sm:h-80 object-cover cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Dot indicators */}
              {plant.photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {plant.photos.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === activePhotoIndex
                          ? "bg-white"
                          : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-48 bg-garden-offwhite flex items-center justify-center">
              <span className="text-6xl opacity-30">
                {getCategoryEmoji(plant.category)}
              </span>
            </div>
          )}

          {/* ---- Content ---- */}
          <div className="px-5 py-6 space-y-6 pb-20">
            {/* ---- Plant Header ---- */}
            <div>
              <h2 className="font-sans text-heading-sm text-garden-text">
                {plant.commonName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {plant.latinName && (
                  <span className="font-sans text-body-sm text-garden-textMuted italic">
                    {plant.latinName}
                  </span>
                )}
                {plant.variety && (
                  <>
                    <span className="text-garden-border">&middot;</span>
                    <span className="font-sans text-body-sm text-garden-textMuted">
                      {plant.variety}
                    </span>
                  </>
                )}
              </div>

              {/* Status badge */}
              {plant.photos.length > 0 && plant.photos[0].status && (
                <span
                  className={`inline-block mt-2 font-sans text-label px-3 py-1 rounded-full status-${plant.photos[0].status}`}
                >
                  {plant.photos[0].status.charAt(0).toUpperCase() +
                    plant.photos[0].status.slice(1)}
                </span>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-4 border-t border-garden-border pt-4">
                {daysGrowing !== null && (
                  <div className="text-center">
                    <p className="font-sans font-bold text-body text-garden-text">
                      {daysGrowing}
                    </p>
                    <p className="font-sans text-label text-garden-textMuted">
                      days growing
                    </p>
                  </div>
                )}
                <div className="text-center">
                  <p className="font-sans font-bold text-body text-garden-text">
                    {plant.photos.length}
                  </p>
                  <p className="font-sans text-label text-garden-textMuted">
                    photos
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-sans font-bold text-body text-garden-text">
                    {plant.careEvents.length}
                  </p>
                  <p className="font-sans text-label text-garden-textMuted">
                    care events
                  </p>
                </div>
              </div>
            </div>

            {/* ---- Care Guide ---- */}
            {plant.careProfile && (
              <CollapsibleSection title="Care Guide" defaultOpen>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-garden-cream rounded-lg p-3">
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-1">
                      Watering
                    </p>
                    <p className="font-sans text-body-sm text-garden-text flex items-center gap-1.5">
                      <span>{"\u{1F4A7}"}</span>
                      {plant.careProfile.wateringNeeds}
                    </p>
                  </div>
                  <div className="bg-garden-cream rounded-lg p-3">
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-1">
                      Sunlight
                    </p>
                    <p className="font-sans text-body-sm text-garden-text flex items-center gap-1.5">
                      <span>{"\u2600\uFE0F"}</span>
                      {plant.careProfile.sunlight}
                    </p>
                  </div>
                  <div className="bg-garden-cream rounded-lg p-3">
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-1">
                      Soil pH
                    </p>
                    <p className="font-sans text-body-sm text-garden-text flex items-center gap-1.5">
                      <span>{"\u{1FAB4}"}</span>
                      {plant.careProfile.soilPh}
                    </p>
                  </div>
                  <div className="bg-garden-cream rounded-lg p-3">
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-1">
                      Feeding
                    </p>
                    <p className="font-sans text-body-sm text-garden-text flex items-center gap-1.5">
                      <span>{"\u{1F33E}"}</span>
                      {plant.careProfile.feedingSchedule}
                    </p>
                  </div>
                </div>

                {/* Common problems */}
                {plant.careProfile.commonProblems.length > 0 && (
                  <div className="mt-3">
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-2">
                      Common Problems
                    </p>
                    <ul className="space-y-1">
                      {plant.careProfile.commonProblems.map((problem, i) => (
                        <li
                          key={i}
                          className="font-sans text-body-sm text-garden-text flex items-start gap-2"
                        >
                          <span className="text-garden-amber mt-0.5">
                            {"\u26A0\uFE0F"}
                          </span>
                          {problem}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Monthly task */}
                {plant.monthlyTask && (
                  <div className="mt-4 bg-garden-greenLight border border-garden-border rounded-lg p-4">
                    <p className="font-sans text-label text-garden-green uppercase tracking-wider mb-1">
                      This Month
                    </p>
                    <p className="font-sans text-body-sm text-garden-text">
                      {plant.monthlyTask}
                    </p>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* ---- Companion Plants ---- */}
            {plant.companionAdvice && (
              <CollapsibleSection title="Companion Plants">
                {plant.companionAdvice.good.length > 0 && (
                  <div className="mb-3">
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-2">
                      Good Companions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plant.companionAdvice.good.map((name) => (
                        <span
                          key={name}
                          className="font-sans text-body-sm bg-green-100 text-green-800 px-3 py-1 rounded-full"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {plant.companionAdvice.bad.length > 0 && (
                  <div>
                    <p className="font-sans text-label text-garden-textMuted uppercase tracking-wider mb-2">
                      Keep Apart
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plant.companionAdvice.bad.map((name) => (
                        <span
                          key={name}
                          className="font-sans text-body-sm bg-red-100 text-red-800 px-3 py-1 rounded-full"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* ---- Ecological Impact ---- */}
            {plant.impact && (
              <CollapsibleSection title="Ecological Impact">
                {/* Grade badge */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-sans font-bold text-xl ${getGradeColor(plant.impact.impactGrade)}`}
                  >
                    {plant.impact.impactGrade}
                  </div>
                  <div>
                    <p className="font-sans text-body text-garden-text font-semibold">
                      Impact Grade
                    </p>
                    <p className="font-sans text-body-sm text-garden-textMuted">
                      Ecological contribution rating
                    </p>
                  </div>
                </div>

                {/* Primary stats with bars */}
                <div className="space-y-4">
                  {plant.impact.primaryStats.map((stat) => {
                    const pct = Math.min(
                      (stat.value / stat.maxValue) * 100,
                      100
                    );
                    return (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-sans text-body-sm text-garden-text">
                            {stat.emoji} {stat.label}
                          </span>
                          <span className="font-sans text-label text-garden-textMuted">
                            {stat.value}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-garden-offwhite rounded-full overflow-hidden">
                          <div
                            className="h-full bg-garden-greenBright rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* ---- Growth Chart ---- */}
            {plant.growthData.length > 0 && (
              <CollapsibleSection title="Growth Tracking">
                <GrowthChart
                  data={plant.growthData.map((g, i) => ({
                    id: `growth-${i}`,
                    plantId: plant.id,
                    date: g.date,
                    heightCm: g.heightCm,
                    leafCount: g.leafCount,
                    healthScore: g.healthScore,
                    notes: "",
                  }))}
                />
              </CollapsibleSection>
            )}

            {/* ---- Harvest Countdown ---- */}
            {isVegetableOrFruit && plant.harvestEstimate && (
              <div className="bg-garden-cream border border-garden-border rounded-xl p-5">
                <h3 className="font-sans font-semibold text-body text-garden-text mb-3">
                  {"\u{1F33D}"} Harvest Countdown
                </h3>
                <p className="font-sans text-body-sm text-garden-textMuted mb-3">
                  Estimated harvest in{" "}
                  <span className="font-semibold text-garden-text">
                    {plant.harvestEstimate.daysRemaining} days
                  </span>
                </p>

                {/* Progress bar */}
                {plant.sowDate && (
                  <div className="w-full h-3 bg-garden-offwhite rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-garden-amber rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((daysBetween(plant.sowDate) /
                              (daysBetween(plant.sowDate) +
                                plant.harvestEstimate.daysRemaining)) *
                              100)
                          )
                        )}%`,
                      }}
                    />
                  </div>
                )}

                <p className="font-sans text-label text-garden-textMuted">
                  Estimated date:{" "}
                  {new Date(plant.harvestEstimate.estimated).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </p>
              </div>
            )}

            {/* ---- Notes ---- */}
            {plant.notes && (
              <div className="bg-garden-offwhite rounded-xl p-5">
                <h3 className="font-sans font-semibold text-body text-garden-text mb-2">
                  Notes
                </h3>
                <p className="font-sans text-body-sm text-garden-textMuted whitespace-pre-wrap">
                  {plant.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
