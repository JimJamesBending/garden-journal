"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Space, Plant, LogEntry } from "@/lib/types";
import { thumbnail, heroImage, cardBackground } from "@/lib/cloudinary";
import { Tooltip } from "@/components/Tooltip";

interface SpacesMapProps {
  spaces: Space[];
  plants: Plant[];
  logs: LogEntry[];
}

function getSpaceIcon(type: string): string {
  const icons: Record<string, string> = {
    greenhouse: "\u{1F33F}",
    "cold-frame": "\u{1F9CA}",
    windowsill: "\u{1FA9F}",
    "raised-bed": "\u{1F33E}",
    polytunnel: "\u{26FA}",
    shelf: "\u{1F4DA}",
    "garden-bed": "\u{1F490}",
  };
  return icons[type] || "\u{1F331}";
}

function getSpaceLabel(type: string): string {
  const labels: Record<string, string> = {
    greenhouse: "Greenhouse",
    "cold-frame": "Cold Frame",
    windowsill: "Windowsill",
    "raised-bed": "Raised Bed",
    polytunnel: "Polytunnel",
    shelf: "Shelf",
    "garden-bed": "Garden Bed",
  };
  return labels[type] || type;
}

export function SpacesMap({ spaces, plants, logs }: SpacesMapProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState(0);

  if (spaces.length === 0) return null;

  const space = spaces[activeSpace];

  const getPlant = (plantId: string): Plant | undefined =>
    plants.find((p) => p.id === plantId);

  const getPlantPhoto = (plantId: string): string | null => {
    const log = logs.find(
      (l) => l.plantId === plantId && l.labeled && l.cloudinaryUrl
    );
    return log?.cloudinaryUrl || null;
  };

  return (
    <section ref={ref} className="py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-mono text-xs text-moss-500 uppercase tracking-[0.3em]">
            Growing Spaces
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-parchment-200 mt-3 mb-4">
            Where Things Grow
          </h2>
          <p className="font-body text-parchment-500/70 max-w-md mx-auto">
            Tap a plant marker to see what&apos;s growing in each{" "}
            <Tooltip term="greenhouse">space</Tooltip>.
          </p>
        </motion.div>

        {/* Space tabs (if multiple spaces) */}
        {spaces.length > 1 && (
          <motion.div
            className="flex flex-wrap justify-center gap-2 mb-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            {spaces.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setActiveSpace(i); setSelectedPin(null); }}
                className={`font-mono text-xs px-4 py-2 rounded-full border transition-all ${
                  activeSpace === i
                    ? "border-parchment-400/60 bg-parchment-400/10 text-parchment-300"
                    : "border-moss-700/40 text-moss-400 hover:border-moss-600/60"
                }`}
              >
                {getSpaceIcon(s.type)} {s.name}
              </button>
            ))}
          </motion.div>
        )}

        {/* Interactive map area */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative rounded-2xl overflow-hidden border border-moss-700/30 bg-moss-800/40"
        >
          {/* Space background image or styled fallback */}
          <div className="relative w-full" style={{ paddingBottom: `${(space.height / space.width) * 100}%`, minHeight: "300px" }}>
            {space.backgroundImageUrl ? (
              <img
                src={heroImage(space.backgroundImageUrl)}
                alt={space.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-moss-800 via-moss-850 to-moss-900">
                {/* Stylised greenhouse outline */}
                <div className="absolute inset-8 border-2 border-dashed border-moss-600/30 rounded-xl flex items-center justify-center">
                  <span className="text-6xl opacity-10">
                    {getSpaceIcon(space.type)}
                  </span>
                </div>
              </div>
            )}

            {/* Dark overlay for pin readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-moss-950/60 via-transparent to-moss-950/30" />

            {/* Space name badge */}
            <div className="absolute top-3 left-3 bg-moss-900/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="text-sm">{getSpaceIcon(space.type)}</span>
              <span className="font-mono text-[10px] text-parchment-300 uppercase tracking-wider">
                <Tooltip term={space.type === "cold-frame" ? "cold frame" : space.type === "raised-bed" ? "earthing up" : space.type}>
                  {space.name}
                </Tooltip>
              </span>
            </div>

            {/* Plant pins */}
            {space.plantPositions.map((pos) => {
              const plant = getPlant(pos.plantId);
              const photo = getPlantPhoto(pos.plantId);
              const isSelected = selectedPin === pos.plantId;

              if (!plant) return null;

              return (
                <div
                  key={pos.plantId}
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Pin marker */}
                  <motion.button
                    onClick={() => setSelectedPin(isSelected ? null : pos.plantId)}
                    className="relative z-10"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={isSelected ? { scale: 1.1 } : {}}
                  >
                    {/* Pin circle with photo or emoji */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 overflow-hidden shadow-lg transition-all ${
                      isSelected
                        ? "border-parchment-400 shadow-parchment-400/30"
                        : "border-white/60 shadow-black/40 hover:border-parchment-300"
                    }`}>
                      {photo ? (
                        <img
                          src={thumbnail(photo)}
                          alt={plant.commonName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-moss-700 flex items-center justify-center text-lg">
                          {plant.category === "flower" ? "\u{1F33A}" : plant.category === "herb" ? "\u{1F33F}" : "\u{1F331}"}
                        </div>
                      )}
                    </div>

                    {/* Pulse ring when selected */}
                    {isSelected && (
                      <motion.div
                        className="absolute inset-[-4px] rounded-full border-2 border-parchment-400/50"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}

                    {/* Label below pin */}
                    <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-parchment-300 bg-moss-900/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
                      {plant.commonName}
                    </span>
                  </motion.button>

                  {/* Info card - appears when selected */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute z-20 top-full mt-8 left-1/2 -translate-x-1/2 w-56 bg-night-950/95 border border-moss-700/50 rounded-xl overflow-hidden shadow-xl"
                      >
                        {/* Connector line */}
                        <svg
                          className="absolute -top-6 left-1/2 -translate-x-1/2"
                          width="2"
                          height="24"
                          viewBox="0 0 2 24"
                        >
                          <motion.line
                            x1="1" y1="0" x2="1" y2="24"
                            stroke="rgba(196, 160, 90, 0.4)"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        </svg>

                        {/* Photo */}
                        {photo && (
                          <img
                            src={heroImage(photo)}
                            alt={plant.commonName}
                            className="w-full h-28 object-cover"
                          />
                        )}

                        {/* Info */}
                        <div className="p-3">
                          <h4 className="font-display text-sm text-parchment-200">
                            {plant.commonName}
                          </h4>
                          <p className="font-body text-[10px] text-parchment-400/50 italic">
                            {plant.latinName}
                          </p>
                          <p className="font-mono text-[10px] text-moss-400 mt-1">
                            {plant.variety}
                          </p>
                          {pos.label && (
                            <p className="font-mono text-[9px] text-moss-500 mt-1">
                              {"\u{1F4CD}"} {pos.label}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-moss-700/30">
                            <span className="font-mono text-[9px] text-moss-400">
                              {plant.location === "indoor" ? "\u{1F3E0}" : "\u{1F33F}"} {plant.location}
                            </span>
                            <span className="font-mono text-[9px] text-moss-500">
                              {Math.floor(
                                (Date.now() - new Date(plant.sowDate).getTime()) / (1000 * 60 * 60 * 24)
                              )} days
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Space description */}
          {space.description && (
            <div className="px-4 py-3 border-t border-moss-700/30">
              <p className="font-body text-xs text-parchment-400/60">
                {space.description}
              </p>
            </div>
          )}
        </motion.div>

        {/* Plant count summary */}
        <motion.p
          className="text-center mt-4 font-mono text-[10px] text-moss-500"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          {space.plantPositions.length} plants in this space &middot;{" "}
          {spaces.length} {spaces.length === 1 ? "space" : "spaces"} total
        </motion.p>
      </div>
    </section>
  );
}
