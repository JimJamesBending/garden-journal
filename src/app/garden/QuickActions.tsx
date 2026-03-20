"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { Plant, LogEntry } from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";

interface QuickActionsProps {
  plants: Plant[];
  logs: LogEntry[];
  onRefresh: () => void;
  onShowPhotos: () => void;
  onShowWizard?: () => void;
}

export function QuickActions({ plants, logs, onRefresh, onShowPhotos, onShowWizard }: QuickActionsProps) {
  const [activeTab, setActiveTab] = useState<"home" | "photo" | "plants" | "settings">("home");
  const [mode, setMode] = useState<"water" | "feed" | null>(null);
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
        }),
      });
      onRefresh();
    } catch {}
    setLogging(false);
    setMode(null);
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
        }),
      });
      onRefresh();
    } catch {}
    setLogging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const navItems = [
    {
      id: "home" as const,
      label: "Home",
      icon: "\u{1F3E0}",
      action: () => setActiveTab("home"),
    },
    {
      id: "photo" as const,
      label: "Add Photo",
      icon: "\u{1F4F7}",
      action: () => {
        if (onShowWizard) {
          onShowWizard();
        } else {
          fileInputRef.current?.click();
        }
      },
    },
    {
      id: "plants" as const,
      label: "Plants",
      icon: "\u{1F331}",
      action: () => {
        onShowPhotos();
        setActiveTab("plants");
      },
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: "\u2699\uFE0F",
      action: () => setActiveTab("settings"),
    },
  ];

  return (
    <>
      {/* Overlay for plant picker */}
      <AnimatePresence>
        {mode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setMode(null)}
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
            className="fixed bottom-[72px] left-4 right-4 z-50 bg-white border border-garden-border rounded-2xl p-4 max-h-[60vh] overflow-y-auto shadow-lg"
          >
            <h3 className="font-sans text-sm font-semibold text-garden-text uppercase tracking-wider mb-3">
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
                    className="bg-garden-offwhite border border-garden-border rounded-xl p-2 text-center active:scale-95 transition-transform disabled:opacity-50 min-h-[48px]"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-1.5">
                      {photo ? (
                        <img src={photo} alt={plant.commonName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-garden-greenLight flex items-center justify-center">
                          <span className="text-lg opacity-40">{"\u{1F331}"}</span>
                        </div>
                      )}
                    </div>
                    <p className="font-sans text-sm text-garden-text truncate">
                      {plant.commonName}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-garden-border">
        <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[64px] px-2 py-1.5 rounded-lg transition-colors ${
                activeTab === item.id
                  ? "text-garden-greenBright"
                  : "text-garden-textMuted hover:text-garden-text"
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className={`font-sans text-sm mt-1 ${
                activeTab === item.id ? "font-semibold" : ""
              }`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

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
