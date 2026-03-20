"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { LogEntry, Plant } from "@/lib/types";
import { timelineImage, galleryImage } from "@/lib/cloudinary";

interface PhotoTimelineProps {
  logs: LogEntry[];
  plants: Plant[];
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    sowed: "bg-amber-400",
    germinated: "bg-green-500",
    transplanted: "bg-green-400",
    flowering: "bg-pink-500",
    harvested: "bg-orange-500",
  };
  return colors[status] || "bg-gray-400";
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    sowed: "bg-amber-100 text-amber-800",
    germinated: "bg-green-100 text-green-800",
    transplanted: "bg-green-100 text-green-800",
    flowering: "bg-pink-100 text-pink-800",
    harvested: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-garden-greenLight text-garden-text";
}

export function PhotoTimeline({ logs, plants }: PhotoTimelineProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Only show labeled photos
  const labeledLogs = logs
    .filter((l) => l.labeled && l.cloudinaryUrl)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getPlantName = (plantId: string): string => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.commonName || "Garden";
  };

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-sans text-base text-garden-textMuted uppercase tracking-[0.3em]">
            The Story So Far
          </span>
          <h2 className="font-sans font-bold text-5xl md:text-6xl text-garden-text mt-3 mb-4">
            Photo Journal
          </h2>
          <p className="font-sans text-garden-textMuted max-w-md mx-auto">
            Every snapshot tells a story of growth.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-garden-border" />

          {labeledLogs.map((log, i) => {
            const isLeft = i % 2 === 0;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  delay: 0.1 * Math.min(i, 10),
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`relative mb-12 md:mb-16 flex items-start ${
                  isLeft
                    ? "md:flex-row md:pr-[52%]"
                    : "md:flex-row-reverse md:pl-[52%]"
                } pl-14 md:pl-0`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-[18px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(
                    log.status
                  )} z-10`}
                />

                {/* Card */}
                <div className="bg-white rounded-2xl overflow-hidden border border-garden-border hover:border-garden-greenBright transition-colors w-full shadow-sm">
                  {/* Photo */}
                  <div
                    className="relative cursor-pointer overflow-hidden"
                    onClick={() => setLightboxUrl(galleryImage(log.cloudinaryUrl))}
                  >
                    <motion.img
                      src={timelineImage(log.cloudinaryUrl)}
                      alt={log.caption}
                      className="w-full h-56 object-cover"
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.3 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span
                        className={`inline-block font-sans text-base uppercase tracking-wider px-2 py-1 rounded-full ${getStatusBadgeColor(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-sans text-base text-garden-text">
                        {getPlantName(log.plantId)}
                      </p>
                      <p className="font-sans text-base text-garden-textMuted">
                        {new Date(log.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="font-sans text-sm text-garden-textMuted">
                      {log.caption}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
              className="absolute top-6 right-6 font-sans text-base text-white/60 hover:text-white transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              Close
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
