"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { Plant, LogEntry } from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";

interface QuickActionsProps {
  plants: Plant[];
  logs: LogEntry[];
  password: string;
  onRefresh: () => void;
  onShowPhotos: () => void;
}

export function QuickActions({ plants, logs, password, onRefresh, onShowPhotos }: QuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "water" | "feed" | null>(null);
  const [logging, setLogging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPlantPhoto = (plantId: string): string | null => {
    const log = logs.find((l) => l.plantId === plantId && l.labeled && l.cloudinaryUrl);
    return log ? thumbnail(log.cloudinaryUrl) : null;
  };

  const logCare = async (plantId: string, type: "watered" | "fed") => {
    setLogging(true);
    try {
      await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId,
          type,
          date: new Date().toISOString().split("T")[0],
          notes: "",
          password,
        }),
      });
      onRefresh();
    } catch {}
    setLogging(false);
    setMode(null);
    setOpen(false);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogging(true);

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
    setLogging(false);
    setOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const actions = [
    { id: "water", label: "Water", icon: "\u{1F4A7}", color: "bg-blue-900/40 border-blue-700/30 text-blue-300" },
    { id: "feed", label: "Feed", icon: "\u{1F33F}", color: "bg-green-900/40 border-green-700/30 text-green-300" },
    { id: "photo", label: "Photo", icon: "\u{1F4F7}", color: "bg-parchment-900/30 border-parchment-700/30 text-parchment-300" },
    { id: "gallery", label: "Gallery", icon: "\u{1F5BC}\uFE0F", color: "bg-moss-800/40 border-moss-700/30 text-moss-300" },
  ];

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => { setOpen(false); setMode(null); }}
          />
        )}
      </AnimatePresence>

      {/* Plant picker for water/feed */}
      <AnimatePresence>
        {mode && (mode === "water" || mode === "feed") && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-night-950/98 border border-moss-700/40 rounded-2xl p-4 max-h-[60vh] overflow-y-auto"
          >
            <h3 className="font-mono text-[11px] text-parchment-300 uppercase tracking-wider mb-3">
              {mode === "water" ? "\u{1F4A7} Which plant?" : "\u{1F33F} Which plant?"}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {plants.map((plant) => {
                const photo = getPlantPhoto(plant.id);
                return (
                  <button
                    key={plant.id}
                    onClick={() => logCare(plant.id, mode === "water" ? "watered" : "fed")}
                    disabled={logging}
                    className="bg-moss-800/30 border border-moss-700/20 rounded-xl p-2 text-center active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-1.5">
                      {photo ? (
                        <img src={photo} alt={plant.commonName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-moss-800 flex items-center justify-center">
                          <span className="text-lg opacity-40">{"\u{1F331}"}</span>
                        </div>
                      )}
                    </div>
                    <p className="font-mono text-[9px] text-parchment-300 truncate">
                      {plant.commonName}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB and action buttons */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col-reverse items-end gap-2">
        {/* Action buttons (shown when open) */}
        <AnimatePresence>
          {open && !mode && (
            <>
              {actions.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    if (action.id === "water") setMode("water");
                    else if (action.id === "feed") setMode("feed");
                    else if (action.id === "photo") fileInputRef.current?.click();
                    else if (action.id === "gallery") { onShowPhotos(); setOpen(false); }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border ${action.color} backdrop-blur-sm shadow-lg active:scale-95 transition-transform`}
                >
                  <span className="text-sm">{action.icon}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={() => { setOpen(!open); setMode(null); }}
          className="w-14 h-14 rounded-full bg-moss-600 hover:bg-moss-500 text-parchment-200 shadow-lg shadow-moss-900/50 flex items-center justify-center active:scale-90 transition-all"
          animate={{ rotate: open ? 45 : 0 }}
        >
          <span className="text-2xl font-light">+</span>
        </motion.button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoto}
      />
    </>
  );
}
