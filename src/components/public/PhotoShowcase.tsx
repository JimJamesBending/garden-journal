"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { LogEntry, Plant } from "@/lib/types";
import { showcaseImage, galleryImage, thumbnail } from "@/lib/cloudinary";

interface PhotoShowcaseProps {
  logs: LogEntry[];
  plants: Plant[];
}

export function PhotoShowcase({ logs, plants }: PhotoShowcaseProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // All labeled photos, newest first
  const photos = logs
    .filter((l) => l.labeled && l.cloudinaryUrl)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getPlantName = (plantId: string): string => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.commonName || "Garden View";
  };

  const getPlantCategory = (plantId: string): string => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.category || "";
  };

  if (photos.length === 0) return null;

  return (
    <section ref={ref} className="py-12 sm:py-16 overflow-hidden">
      {/* Section header */}
      <motion.div
        className="text-center mb-8 px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
      >
        <span className="font-mono text-xs text-moss-500 uppercase tracking-[0.3em]">
          {"\u{1F9A6}"} From the Garden
        </span>
        <h2 className="font-display text-4xl md:text-5xl font-light text-parchment-200 mt-2">
          Latest Snaps
        </h2>
      </motion.div>

      {/* Auto-scrolling photo strip */}
      <div className="relative">
        <motion.div
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {photos.map((log, i) => {
            const isExpanded = expandedId === log.id;
            const plantName = getPlantName(log.plantId);
            const category = getPlantCategory(log.plantId);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
                className={`flex-shrink-0 snap-center relative rounded-2xl overflow-hidden border border-moss-700/30 cursor-pointer transition-all duration-500 ${
                  isExpanded ? "w-72 sm:w-80" : "w-48 sm:w-56"
                }`}
                onClick={() => {
                  if (isExpanded) {
                    setLightboxUrl(galleryImage(log.cloudinaryUrl));
                  } else {
                    setExpandedId(isExpanded ? null : log.id);
                  }
                }}
              >
                {/* Photo */}
                <div className="relative h-64 sm:h-72">
                  <img
                    src={showcaseImage(log.cloudinaryUrl)}
                    alt={log.caption || plantName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Plant name label */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-display text-sm text-parchment-200 truncate">
                      {plantName}
                    </p>
                    {log.caption && isExpanded && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="font-body text-[11px] text-parchment-400/70 mt-1 line-clamp-2"
                      >
                        {log.caption}
                      </motion.p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[9px] text-moss-400">
                        {new Date(log.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {category && (
                        <span className="font-mono text-[9px] text-moss-500 uppercase">
                          {category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status pip */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      log.status === "flowering" ? "bg-parchment-400 animate-pulse" :
                      log.status === "germinated" ? "bg-moss-400" :
                      log.status === "transplanted" ? "bg-moss-300" :
                      "bg-moss-600"
                    }`} />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* "More photos" card */}
          <motion.a
            href="/garden"
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1 + photos.length * 0.06, duration: 0.5 }}
            className="flex-shrink-0 snap-center w-48 sm:w-56 h-64 sm:h-72 rounded-2xl border border-dashed border-moss-600/40 flex flex-col items-center justify-center gap-3 hover:border-moss-500/60 transition-colors"
          >
            <span className="text-3xl opacity-40">{"\u{1F4F7}"}</span>
            <span className="font-mono text-xs text-moss-400 uppercase tracking-wider">
              View All
            </span>
            <span className="font-mono text-[10px] text-moss-500">
              {photos.length} photos
            </span>
          </motion.a>
        </motion.div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <motion.img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          />
          <button
            className="absolute top-6 right-6 font-mono text-sm text-white/60 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            {"\u2715"} Close
          </button>
        </motion.div>
      )}
    </section>
  );
}
