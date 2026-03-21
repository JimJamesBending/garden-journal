"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Space, Plant, LogEntry, SPACE_HIERARCHY, type SpaceType } from "@/lib/types";
import { thumbnail, heroImage, cardBackground } from "@/lib/cloudinary";
import { Tooltip } from "@/components/Tooltip";

interface SpacesMapProps {
  spaces: Space[];
  plants: Plant[];
  logs: LogEntry[];
}

function getSpaceIcon(type: string): string {
  return SPACE_HIERARCHY[type as SpaceType]?.icon || "\u{1F331}";
}

function getSpaceLabel(type: string): string {
  return SPACE_HIERARCHY[type as SpaceType]?.label || type;
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
          <span className="font-sans text-base text-garden-textMuted uppercase tracking-[0.3em]">
            Growing Spaces
          </span>
          <h2 className="font-sans font-bold text-4xl sm:text-5xl md:text-6xl text-garden-text mt-3 mb-4">
            Where Things Grow
          </h2>
          <p className="font-sans text-garden-textMuted max-w-md mx-auto">
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
                className={`font-sans text-base px-4 py-2 rounded-full border transition-all min-h-[48px] ${
                  activeSpace === i
                    ? "border-garden-greenBright bg-garden-greenLight text-garden-text"
                    : "border-garden-border text-garden-textMuted hover:border-garden-greenBright"
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
          className="relative rounded-2xl overflow-hidden border border-garden-border bg-garden-greenLight"
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
              <div className="absolute inset-0 bg-garden-greenLight">
                {/* Stylised greenhouse outline */}
                <div className="absolute inset-8 border-2 border-dashed border-garden-border rounded-xl flex items-center justify-center">
                  <span className="text-6xl opacity-10">
                    {getSpaceIcon(space.type)}
                  </span>
                </div>
              </div>
            )}

            {/* Light overlay for pin readability */}
            <div className="absolute inset-0 bg-white/30" />

            {/* Space name badge */}
            <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="text-sm">{getSpaceIcon(space.type)}</span>
              <span className="font-sans text-base text-garden-text uppercase tracking-wider">
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
                        ? "border-garden-greenBright shadow-garden-greenBright/30"
                        : "border-white shadow-black/20 hover:border-garden-greenBright"
                    }`}>
                      {photo ? (
                        <img
                          src={thumbnail(photo)}
                          alt={plant.commonName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-garden-greenLight flex items-center justify-center text-lg">
                          {plant.category === "flower" ? "\u{1F33A}" : plant.category === "herb" ? "\u{1F33F}" : "\u{1F331}"}
                        </div>
                      )}
                    </div>

                    {/* Pulse ring when selected */}
                    {isSelected && (
                      <motion.div
                        className="absolute inset-[-4px] rounded-full border-2 border-garden-greenBright/50"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}

                    {/* Label below pin */}
                    <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-sans text-sm text-garden-text bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
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
                        className="absolute z-20 top-full mt-8 left-1/2 -translate-x-1/2 w-56 bg-white border border-garden-border rounded-xl overflow-hidden shadow-xl"
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
                            stroke="rgba(46, 125, 50, 0.4)"
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
                          <h4 className="font-sans font-bold text-sm text-garden-text">
                            {plant.commonName}
                          </h4>
                          <p className="font-sans text-base text-garden-textMuted italic">
                            {plant.latinName}
                          </p>
                          <p className="font-sans text-base text-garden-textMuted mt-1">
                            {plant.variety}
                          </p>
                          {pos.label && (
                            <p className="font-sans text-sm text-garden-textMuted mt-1">
                              {"\u{1F4CD}"} {pos.label}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-garden-border">
                            <span className="font-sans text-sm text-garden-textMuted">
                              {plant.location === "indoor" ? "\u{1F3E0}" : "\u{1F33F}"} {plant.location}
                            </span>
                            <span className="font-sans text-sm text-garden-textMuted">
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
            <div className="px-4 py-3 border-t border-garden-border">
              <p className="font-sans text-base text-garden-textMuted">
                {space.description}
              </p>
            </div>
          )}
        </motion.div>

        {/* Plant count summary */}
        <motion.p
          className="text-center mt-4 font-sans text-base text-garden-textMuted"
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
