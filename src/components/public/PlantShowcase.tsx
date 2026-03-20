"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Plant, LogEntry } from "@/lib/types";
import { heroImage, cardBackground } from "@/lib/cloudinary";
import { Tooltip } from "@/components/Tooltip";

interface PlantShowcaseProps {
  plants: Plant[];
  logs: LogEntry[];
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    sowed: "Sown",
    germinated: "Germinated",
    transplanted: "Transplanted",
    flowering: "Flowering",
    harvested: "Harvested",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    sowed: "bg-amber-100 text-amber-800",
    germinated: "bg-green-100 text-green-800",
    transplanted: "bg-green-100 text-green-800",
    flowering: "bg-pink-100 text-pink-800",
    harvested: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-garden-greenLight text-garden-text";
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

  const getPlantPhoto = (plantId: string): string | null => {
    const plantLog = logs.find(
      (l) => l.plantId === plantId && l.cloudinaryUrl && l.labeled
    );
    return plantLog?.cloudinaryUrl || null;
  };

  const getPhotoCount = (plantId: string): number => {
    return logs.filter(
      (l) => l.plantId === plantId && l.cloudinaryUrl && l.labeled
    ).length;
  };

  const getPlantStatus = (plantId: string): string => {
    const plantLog = logs.find((l) => l.plantId === plantId && l.labeled);
    return plantLog?.status || "sowed";
  };

  return (
    <section ref={ref} className="py-16 sm:py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-sans text-base text-garden-textMuted uppercase tracking-[0.3em]">
            The Collection
          </span>
          <h2 className="font-sans font-bold text-4xl sm:text-5xl md:text-6xl text-garden-text mt-3 mb-4">
            What&apos;s Growing
          </h2>
          <p className="font-sans text-garden-textMuted max-w-md mx-auto">
            Every plant, tracked from{" "}
            <Tooltip term="germination">seed</Tooltip> to harvest.
          </p>
        </motion.div>

        {/* Category filters */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`font-sans text-base uppercase tracking-wider px-4 py-2 rounded-full border transition-all duration-300 min-h-[48px] ${
                activeFilter === cat
                  ? "border-garden-greenBright bg-garden-greenLight text-garden-text"
                  : "border-garden-border text-garden-textMuted hover:border-garden-greenBright hover:text-garden-text"
              }`}
            >
              {cat === "all" ? "All" : `${getCategoryIcon(cat)} ${cat}`}
            </button>
          ))}
        </motion.div>

        {/* Plant cards grid - photo-heavy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((plant, i) => {
            const photo = getPlantPhoto(plant.id);
            const status = getPlantStatus(plant.id);
            const days = daysSince(plant.sowDate);
            const photoCount = getPhotoCount(plant.id);

            return (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{
                  delay: 0.1 * Math.min(i, 8),
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="group relative rounded-2xl overflow-hidden border border-garden-border hover:border-garden-greenBright transition-all"
              >
                {/* Card image - tall, prominent */}
                <div className="relative h-60 sm:h-72 overflow-hidden">
                  {photo ? (
                    <>
                      {/* Blurred background fill */}
                      <img
                        src={cardBackground(photo)}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 w-full h-full object-cover scale-110"
                      />
                      {/* Sharp foreground */}
                      <motion.img
                        src={heroImage(photo)}
                        alt={plant.commonName}
                        className="relative w-full h-full object-cover"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-garden-greenLight flex flex-col items-center justify-center gap-2">
                      <span className="text-5xl opacity-20">
                        {getCategoryIcon(plant.category)}
                      </span>
                      <span className="font-sans text-base text-garden-textMuted uppercase tracking-wider">
                        Needs a photo!
                      </span>
                      <span className="text-lg opacity-30">{"\u{1F4F7}"}</span>
                    </div>
                  )}

                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent" />

                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`font-sans text-base uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusColor(status)}`}
                    >
                      {status === "flowering" && (
                        <motion.span
                          className="inline-block mr-1"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          {"\u2022"}
                        </motion.span>
                      )}
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  {/* Photo count */}
                  {photoCount > 0 && (
                    <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                      <span className="text-base">{"\u{1F4F7}"}</span>
                      <span className="font-sans text-base text-garden-text">
                        {photoCount}
                      </span>
                    </div>
                  )}

                  {/* Plant name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-sans font-bold text-xl text-garden-text mb-0.5">
                      {plant.commonName}
                    </h3>
                    <p className="font-sans text-base text-garden-textMuted italic">
                      {plant.latinName}
                    </p>
                  </div>
                </div>

                {/* Card body */}
                <div className="bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-sans text-base text-garden-textMuted uppercase tracking-wider">
                      {plant.variety}
                    </span>
                    <span className="font-sans text-base text-garden-textMuted">
                      {plant.location === "indoor" ? "\u{1F3E0}" : "\u{1F33F}"}{" "}
                      {plant.location}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-garden-border pt-2.5">
                    <div className="font-sans text-base text-garden-textMuted">
                      <Tooltip term="growing season">
                        <span className="text-garden-text">{days}</span> days growing
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{getCategoryIcon(plant.category)}</span>
                      <span className="font-sans text-base text-garden-textMuted capitalize">
                        {plant.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t from-garden-greenLight/20 via-transparent to-transparent" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
