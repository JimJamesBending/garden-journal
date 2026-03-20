"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { AdviceEntry, Plant, LogEntry } from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";

interface PriorityStripProps {
  advice: AdviceEntry[];
  plants: Plant[];
  logs: LogEntry[];
  onRefresh: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  "this-week": "\u2705",
  "coming-up": "\u{1F4C5}",
  "weather-alert": "\u26A0\uFE0F",
  problem: "\u{1F41B}",
  harvest: "\u{1F33E}",
  "buy-list": "\u{1F6D2}",
  seasonal: "\u{1F331}",
  "growth-update": "\u{1F4CA}",
  "fun-fact": "\u{1F4A1}",
};

export function PriorityStrip({ advice, plants, logs, onRefresh }: PriorityStripProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logging, setLogging] = useState<string | null>(null);

  const urgentItems = advice.filter(
    (a) => (a.priority === "urgent" || a.priority === "high") && a.actionRequired
  );

  if (urgentItems.length === 0) return null;

  const getPlantPhoto = (plantId: string): string | null => {
    const log = logs.find((l) => l.plantId === plantId && l.labeled && l.cloudinaryUrl);
    return log ? thumbnail(log.cloudinaryUrl) : null;
  };

  const getPlantName = (plantId: string): string => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.commonName || "Garden";
  };

  const logCare = async (plantId: string, type: "watered" | "fed") => {
    setLogging(`${plantId}-${type}`);
    try {
      await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId,
          type,
          date: new Date().toISOString().split("T")[0],
          notes: "",
        }),
      });
      onRefresh();
    } catch {}
    setLogging(null);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-garden-greenBright opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-garden-greenBright" />
        </span>
        <h2 className="font-sans text-base text-garden-text uppercase tracking-wider">
          Needs Attention
        </h2>
        <span className="font-sans text-base text-garden-textMuted">
          {urgentItems.length}
        </span>
      </div>

      <div className="overflow-x-auto flex gap-3 pb-2 snap-x snap-mandatory scrollbar-hide">
        {urgentItems.map((item) => {
          const photo = getPlantPhoto(item.plantId);
          const isExpanded = expandedId === item.id;
          const isWeather = item.category === "weather-alert";
          const borderColor = item.priority === "urgent" ? "border-red-500/60" : "border-garden-border";
          const showWaterBtn = item.title.toLowerCase().includes("water");
          const showFeedBtn = item.title.toLowerCase().includes("feed");

          return (
            <motion.div
              key={item.id}
              className={`min-w-[200px] max-w-[240px] snap-start flex-shrink-0 bg-garden-greenLight border ${borderColor} rounded-xl overflow-hidden`}
              layout
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full text-left"
              >
                {/* Photo / Icon header */}
                <div className="relative h-20 overflow-hidden">
                  {photo && !isWeather ? (
                    <img
                      src={photo}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-garden-greenLight flex items-center justify-center">
                      <span className="text-2xl">
                        {CATEGORY_ICONS[item.category] || "\u{1F33F}"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-white/80" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="font-sans text-sm text-garden-textMuted uppercase">
                      {getPlantName(item.plantId)}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <div className="px-3 py-2">
                  <p className="font-sans text-base text-garden-text leading-snug line-clamp-2">
                    {item.title}
                  </p>
                </div>
              </button>

              {/* Expanded body */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-garden-border pt-2">
                      <p className="font-sans text-base text-garden-textMuted leading-relaxed mb-2">
                        {item.body}
                      </p>
                      {/* Quick action buttons */}
                      {(showWaterBtn || showFeedBtn) && item.plantId && (
                        <div className="flex gap-2">
                          {showWaterBtn && (
                            <button
                              onClick={(e) => { e.stopPropagation(); logCare(item.plantId, "watered"); }}
                              disabled={logging === `${item.plantId}-watered`}
                              className="flex-1 font-sans text-base bg-blue-50 border border-blue-300 text-blue-700 rounded-lg py-1.5 active:scale-95 transition-transform disabled:opacity-50 min-h-[48px]"
                            >
                              {logging === `${item.plantId}-watered` ? "..." : "\u{1F4A7} Done"}
                            </button>
                          )}
                          {showFeedBtn && (
                            <button
                              onClick={(e) => { e.stopPropagation(); logCare(item.plantId, "fed"); }}
                              disabled={logging === `${item.plantId}-fed`}
                              className="flex-1 font-sans text-base bg-green-50 border border-green-300 text-green-700 rounded-lg py-1.5 active:scale-95 transition-transform disabled:opacity-50 min-h-[48px]"
                            >
                              {logging === `${item.plantId}-fed` ? "..." : "\u{1F33F} Done"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
