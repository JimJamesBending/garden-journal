"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { LogEntry, Plant } from "@/lib/types";
import { galleryImage, thumbnail } from "@/lib/cloudinary";

interface PhotoJournalProps {
  logs: LogEntry[];
  plants: Plant[];
  onBack: () => void;
  onRefresh: () => void;
}

export function PhotoJournal({ logs, plants, onBack, onRefresh }: PhotoJournalProps) {
  const [filter, setFilter] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const labeledLogs = logs
    .filter((l) => l.labeled && l.cloudinaryUrl)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredLogs = filter === "all"
    ? labeledLogs
    : labeledLogs.filter((l) => l.plantId === filter);

  // Get unique plants that have photos
  const plantsWithPhotos = plants.filter((p) =>
    labeledLogs.some((l) => l.plantId === p.id)
  );

  const getPlantName = (plantId: string): string => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.commonName || "Garden";
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "garden_log");

      const cloudRes = await fetch(
        "https://api.cloudinary.com/v1_1/davterbwx/image/upload",
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json();

      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryUrl: cloudData.secure_url,
          plantId: "",
          caption: "",
          status: "sowed",
        }),
      });
      onRefresh();
    } catch {}
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="min-h-screen bg-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-garden-border">
        <button
          onClick={onBack}
          className="font-sans text-base text-garden-textMuted hover:text-garden-text transition-colors min-h-[48px] min-w-[48px]"
        >
          {"\u2190"} Back
        </button>
        <h2 className="font-sans font-bold text-lg text-garden-text">Photo Journal</h2>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="font-sans text-base text-garden-textMuted bg-garden-greenLight border border-garden-border px-3 py-1.5 rounded-full active:scale-95 disabled:opacity-50 min-h-[48px] min-w-[48px]"
          >
            {uploading ? "..." : "\u{1F5BC}\uFE0F"}
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="font-sans text-base text-garden-textMuted bg-garden-greenLight border border-garden-border px-3 py-1.5 rounded-full active:scale-95 disabled:opacity-50 min-h-[48px] min-w-[48px]"
          >
            {uploading ? "..." : "\u{1F4F7}"}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="overflow-x-auto flex gap-2 px-4 py-3 scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={`font-sans text-base px-3 py-1.5 rounded-full whitespace-nowrap transition-colors min-h-[48px] ${
            filter === "all"
              ? "bg-garden-greenBright text-white"
              : "bg-garden-greenLight text-garden-textMuted"
          }`}
        >
          All ({labeledLogs.length})
        </button>
        {plantsWithPhotos.map((plant) => {
          const count = labeledLogs.filter((l) => l.plantId === plant.id).length;
          return (
            <button
              key={plant.id}
              onClick={() => setFilter(plant.id)}
              className={`font-sans text-base px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[48px] ${
                filter === plant.id
                  ? "bg-garden-greenBright text-white"
                  : "bg-garden-greenLight text-garden-textMuted"
              }`}
            >
              {(() => {
                const photo = labeledLogs.find((l) => l.plantId === plant.id);
                return photo ? (
                  <img
                    src={thumbnail(photo.cloudinaryUrl)}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : null;
              })()}
              {plant.commonName} ({count})
            </button>
          );
        })}
      </div>

      {/* Masonry grid */}
      <div className="px-4 pb-8 columns-2 gap-2 space-y-2">
        {filteredLogs.map((log, i) => (
          <motion.button
            key={log.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            onClick={() => setLightboxIndex(i)}
            className="w-full break-inside-avoid rounded-xl overflow-hidden bg-garden-greenLight border border-garden-border"
          >
            <img
              src={galleryImage(log.cloudinaryUrl)}
              alt={log.caption}
              className="w-full"
              loading="lazy"
            />
            <div className="px-2.5 py-2">
              <p className="font-sans text-sm text-garden-textMuted">
                {getPlantName(log.plantId)}
              </p>
              {log.caption && (
                <p className="font-sans text-base text-garden-text truncate">
                  {log.caption}
                </p>
              )}
              <p className="font-sans text-sm text-garden-textMuted mt-0.5">
                {new Date(log.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredLogs[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
          >
            <button
              className="absolute top-4 right-4 font-sans text-base text-white/60 hover:text-white z-10 min-h-[48px] min-w-[48px]"
              onClick={() => setLightboxIndex(null)}
            >
              {"\u2715"}
            </button>

            <img
              src={galleryImage(filteredLogs[lightboxIndex].cloudinaryUrl)}
              alt={filteredLogs[lightboxIndex].caption}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />

            <div className="mt-4 text-center">
              <p className="font-sans text-base text-white/70">
                {getPlantName(filteredLogs[lightboxIndex].plantId)}
              </p>
              <p className="font-sans text-base text-white mt-1">
                {filteredLogs[lightboxIndex].caption}
              </p>
              <p className="font-sans text-base text-white/60 mt-1">
                {new Date(filteredLogs[lightboxIndex].date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Nav arrows */}
            <div className="flex gap-8 mt-4">
              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="font-sans text-base text-white/50 hover:text-white min-h-[48px] min-w-[48px]"
                >
                  {"\u2190"} Prev
                </button>
              )}
              {lightboxIndex < filteredLogs.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="font-sans text-base text-white/50 hover:text-white min-h-[48px] min-w-[48px]"
                >
                  Next {"\u2192"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleUpload}
      />
    </motion.div>
  );
}
