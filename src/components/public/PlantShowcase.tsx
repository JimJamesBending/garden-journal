"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Plant, LogEntry } from "@/lib/types";
import { heroImage, thumbnail } from "@/lib/cloudinary";

interface PlantShowcaseProps {
  plants: Plant[];
  logs: LogEntry[];
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    sowed: "bg-earth-600/60 text-earth-200",
    germinated: "bg-moss-600/60 text-moss-200",
    transplanted: "bg-moss-500/60 text-moss-100",
    flowering: "bg-parchment-600/60 text-parchment-200",
    harvested: "bg-parchment-500/60 text-parchment-100",
  };
  return colors[status] || "bg-moss-700/60 text-moss-300";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    fruit: "\u{1F353}",
    vegetable: "\u{1F966}",
    herb: "\u{1F33F}",
    flower: "\u{1F33A}",
  };
  return icons[category] || "\u{1F331}";
}

function daysSince(date: string): number {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function PlantShowcase({ plants, logs }: PlantShowcaseProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const categories = ["all", ...new Set(plants.map((p) => p.category))];

  const filtered =
    activeFilter === "all"
      ? plants
      : plants.filter((p) => p.category === activeFilter);

  // Get latest labeled photo for each plant
  const getPlantPhoto = (plantId: string): string | null => {
    const plantLog = logs.find(
      (l) => l.plantId === plantId && l.cloudinaryUrl && l.labeled
    );
    return plantLog?.cloudinaryUrl || null;
  };

  // Get latest status for each plant
  const getPlantStatus = (plantId: string): string => {
    const plantLog = logs.find((l) => l.plantId === plantId && l.labeled);
    return plantLog?.status || "sowed";
  };

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-mono text-xs text-moss-500 uppercase tracking-[0.3em]">
            The Collection
          </span>
          <h2 className="font-display text-5xl md:text-6xl font-light text-parchment-200 mt-3 mb-4">
            What&apos;s Growing
          </h2>
          <p className="font-body text-parchment-500/70 max-w-md mx-auto">
            Every plant, tracked from seed to harvest. Tap any card to see its
            full story.
          </p>
        </motion.div>

        {/* Category filters */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-full border transition-all duration-300 ${
                activeFilter === cat
                  ? "border-parchment-400/60 bg-parchment-400/10 text-parchment-300"
                  : "border-moss-700/40 text-moss-400 hover:border-moss-600/60 hover:text-parchment-400"
              }`}
            >
              {cat === "all" ? "All" : `${getCategoryIcon(cat)} ${cat}`}
            </button>
          ))}
        </motion.div>

        {/* Plant cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((plant, i) => {
            const photo = getPlantPhoto(plant.id);
            const status = getPlantStatus(plant.id);
            const days = daysSince(plant.sowDate);

            return (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{
                  delay: 0.1 * i,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.3 },
                }}
                className="group relative bg-moss-800/40 rounded-2xl overflow-hidden border border-moss-700/30 hover:border-moss-600/50 transition-colors"
              >
                {/* Card image */}
                <div className="relative h-52 overflow-hidden">
                  {photo ? (
                    <motion.img
                      src={heroImage(photo)}
                      alt={plant.commonName}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-moss-800 to-moss-900 flex items-center justify-center">
                      <span className="text-4xl opacity-30">
                        {getCategoryIcon(plant.category)}
                      </span>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-moss-900 via-transparent to-transparent" />

                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm ${getStatusColor(status)}`}
                    >
                      {status === "flowering" && (
                        <motion.span
                          className="inline-block mr-1"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: "easeInOut",
                          }}
                        >
                          \u2022
                        </motion.span>
                      )}
                      {status}
                    </span>
                  </div>

                  {/* Category icon */}
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-moss-900/70 backdrop-blur-sm flex items-center justify-center text-sm">
                    {getCategoryIcon(plant.category)}
                  </div>
                </div>

                {/* Card content */}
                <div className="p-5">
                  <h3 className="font-display text-xl text-parchment-200 mb-1">
                    {plant.commonName}
                  </h3>
                  <p className="font-mono text-[10px] text-moss-400 uppercase tracking-wider mb-3">
                    {plant.variety}
                  </p>
                  <p className="font-body text-xs text-parchment-500/60 italic mb-4">
                    {plant.latinName}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center justify-between border-t border-moss-700/30 pt-3">
                    <div className="font-mono text-[10px] text-moss-400">
                      <span className="text-parchment-400">{days}</span> days
                      growing
                    </div>
                    <div className="font-mono text-[10px] text-moss-500">
                      {plant.location === "indoor" ? "\u{1F3E0}" : "\u{1F33F}"}{" "}
                      {plant.location}
                    </div>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t from-parchment-400/5 via-transparent to-transparent" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
