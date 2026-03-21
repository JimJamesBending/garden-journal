"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { SPACE_HIERARCHY, type SpaceType, type SpaceSubtype } from "@/lib/types";
import { thumbnail, heroImage } from "@/lib/cloudinary";
import { Tooltip } from "@/components/Tooltip";

// DB-shaped types from page.tsx
interface DbPlant {
  id: string;
  common_name: string;
  latin_name: string | null;
  category: string | null;
  variety: string | null;
  location: string | null;
  sow_date: string | null;
}

interface DbLogEntry {
  id: string;
  plant_id: string;
  cloudinary_url: string | null;
  labeled: boolean | null;
}

interface DbSpace {
  id: string;
  garden_id: string;
  name: string;
  type: SpaceType;
  description: string | null;
  background_image_url: string | null;
  plant_positions: Array<{
    plantId: string;
    x: number;
    y: number;
    subtype?: SpaceSubtype;
  }> | null;
}

interface GardenSpacesProps {
  spaces: DbSpace[];
  plants: DbPlant[];
  logsByPlant: Record<string, DbLogEntry[]>;
  onPlantClick: (plantId: string) => void;
}

function getSpaceIcon(type: string): string {
  return SPACE_HIERARCHY[type as SpaceType]?.icon || "\u{1F331}";
}

export function GardenSpaces({
  spaces,
  plants,
  logsByPlant,
  onPlantClick,
}: GardenSpacesProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState(0);

  // Filter to spaces that have plant positions
  const validSpaces = spaces.filter(
    (s) => s.plant_positions && s.plant_positions.length > 0
  );

  if (validSpaces.length === 0) return null;

  const space = validSpaces[activeSpace];
  const positions = space.plant_positions || [];

  const getPlant = (plantId: string) =>
    plants.find((p) => p.id === plantId);

  const getPlantPhoto = (plantId: string): string | null => {
    const logs = logsByPlant[plantId] || [];
    const labeled = logs.find((l) => l.labeled && l.cloudinary_url);
    return labeled?.cloudinary_url || logs[0]?.cloudinary_url || null;
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
          <span className="font-sans text-xs text-garden-textMuted uppercase tracking-[0.3em]">
            Growing Spaces
          </span>
          <h2 className="font-sans font-bold text-3xl sm:text-4xl text-garden-text mt-3 mb-4">
            Where Things Grow
          </h2>
          <p className="font-sans text-body-sm text-garden-textMuted max-w-md mx-auto">
            Tap a plant marker to see what&apos;s growing in each{" "}
            <Tooltip term="greenhouse">space</Tooltip>.
          </p>
        </motion.div>

        {/* Space tabs */}
        {validSpaces.length > 1 && (
          <motion.div
            className="flex flex-wrap justify-center gap-2 mb-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            {validSpaces.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSpace(i);
                  setSelectedPin(null);
                }}
                className={`font-sans text-body-sm px-4 py-2 rounded-full border transition-all min-h-[44px] ${
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

        {/* Interactive map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative rounded-2xl overflow-hidden border border-garden-border bg-garden-greenLight"
        >
          <div
            className="relative w-full"
            style={{ paddingBottom: "60%", minHeight: "300px" }}
          >
            {space.background_image_url ? (
              <img
                src={heroImage(space.background_image_url)}
                alt={space.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-garden-greenLight">
                <div className="absolute inset-8 border-2 border-dashed border-garden-border rounded-xl flex items-center justify-center">
                  <span className="text-6xl opacity-10">
                    {getSpaceIcon(space.type)}
                  </span>
                </div>
              </div>
            )}

            {/* Light overlay */}
            <div className="absolute inset-0 bg-white/30" />

            {/* Space name badge */}
            <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="text-sm">{getSpaceIcon(space.type)}</span>
              <span className="font-sans text-xs text-garden-text uppercase tracking-wider">
                {space.name}
              </span>
            </div>

            {/* Plant pins */}
            {positions.map((pos) => {
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
                  <motion.button
                    onClick={() =>
                      setSelectedPin(isSelected ? null : pos.plantId)
                    }
                    className="relative z-10"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={isSelected ? { scale: 1.1 } : {}}
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 overflow-hidden shadow-lg transition-all ${
                        isSelected
                          ? "border-garden-greenBright shadow-garden-greenBright/30"
                          : "border-white shadow-black/20 hover:border-garden-greenBright"
                      }`}
                    >
                      {photo ? (
                        <img
                          src={thumbnail(photo)}
                          alt={plant.common_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-garden-greenLight flex items-center justify-center text-lg">
                          {"\u{1F331}"}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <motion.div
                        className="absolute inset-[-4px] rounded-full border-2 border-garden-greenBright/50"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}

                    <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-sans text-xs text-garden-text bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
                      {plant.common_name}
                    </span>
                  </motion.button>

                  {/* Info card */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute z-20 top-full mt-8 left-1/2 -translate-x-1/2 w-56 bg-white border border-garden-border rounded-xl overflow-hidden shadow-xl"
                      >
                        {photo && (
                          <img
                            src={heroImage(photo)}
                            alt={plant.common_name}
                            className="w-full h-28 object-cover"
                          />
                        )}
                        <div className="p-3">
                          <h4 className="font-sans font-bold text-sm text-garden-text">
                            {plant.common_name}
                          </h4>
                          {plant.latin_name && (
                            <p className="font-sans text-xs text-garden-textMuted italic">
                              {plant.latin_name}
                            </p>
                          )}
                          {plant.variety && (
                            <p className="font-sans text-xs text-garden-textMuted mt-0.5">
                              {plant.variety}
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlantClick(pos.plantId);
                            }}
                            className="mt-2 w-full text-center font-sans text-xs text-garden-greenBright font-medium hover:underline"
                          >
                            View details
                          </button>
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
              <p className="font-sans text-body-sm text-garden-textMuted">
                {space.description}
              </p>
            </div>
          )}
        </motion.div>

        {/* Plant count */}
        <motion.p
          className="text-center mt-4 font-sans text-body-sm text-garden-textMuted"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          {positions.length} {positions.length === 1 ? "plant" : "plants"} in
          this space &middot; {validSpaces.length}{" "}
          {validSpaces.length === 1 ? "space" : "spaces"} total
        </motion.p>
      </div>
    </section>
  );
}
