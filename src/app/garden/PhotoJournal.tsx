"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { LogEntry, Plant } from "@/lib/types";
import { galleryImage, thumbnail } from "@/lib/cloudinary";

interface PhotoJournalProps {
  logs: LogEntry[];
  plants: Plant[];
  password: string;
  onBack: () => void;
  onRefresh: () => void;
}

export function PhotoJournal({ logs, plants, password, onBack, onRefresh }: PhotoJournalProps) {
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
          password,
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
      className="min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-moss-800/50">
        <button
          onClick={onBack}
          className="font-mono text-xs text-moss-400 hover:text-parchment-300 transition-colors"
        >
          {"\u2190"} Back
        </button>
        <h2 className="font-display text-lg text-parchment-200">Photo Journal</h2>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="font-mono text-[10px] text-moss-400 bg-moss-800/40 border border-moss-700/30 px-3 py-1.5 rounded-full active:scale-95 disabled:opacity-50"
          >
            {uploading ? "..." : "\u{1F5BC}\uFE0F"}
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="font-mono text-[10px] text-moss-400 bg-moss-800/40 border border-moss-700/30 px-3 py-1.5 rounded-full active:scale-95 disabled:opacity-50"
          >
            {uploading ? "..." : "\u{1F4F7}"}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="overflow-x-auto flex gap-2 px-4 py-3 scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={`font-mono text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
            filter === "all"
              ? "bg-moss-600 text-parchment-200"
              : "bg-moss-800/30 text-moss-400"
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
              className={`font-mono text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filter === plant.id
                  ? "bg-moss-600 text-parchment-200"
                  : "bg-moss-800/30 text-moss-400"
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
            className="w-full break-inside-avoid rounded-xl overflow-hidden bg-moss-800/30 border border-moss-700/20"
          >
            <img
              src={galleryImage(log.cloudinaryUrl)}
              alt={log.caption}
              className="w-full"
              loading="lazy"
            />
            <div className="px-2.5 py-2">
              <p className="font-mono text-[9px] text-moss-400">
                {getPlantName(log.plantId)}
              </p>
              {log.caption && (
                <p className="font-body text-[10px] text-parchment-400/70 truncate">
                  {log.caption}
                </p>
              )}
              <p className="font-mono text-[8px] text-moss-600 mt-0.5">
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
              className="absolute top-4 right-4 font-mono text-sm text-white/60 hover:text-white z-10"
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
              <p className="font-mono text-xs text-moss-400">
                {getPlantName(filteredLogs[lightboxIndex].plantId)}
              </p>
              <p className="font-body text-sm text-parchment-300 mt-1">
                {filteredLogs[lightboxIndex].caption}
              </p>
              <p className="font-mono text-[10px] text-moss-600 mt-1">
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
                  className="font-mono text-sm text-white/50 hover:text-white"
                >
                  {"\u2190"} Prev
                </button>
              )}
              {lightboxIndex < filteredLogs.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="font-mono text-sm text-white/50 hover:text-white"
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
