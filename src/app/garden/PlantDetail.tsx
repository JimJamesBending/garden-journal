"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { Plant, LogEntry, GrowthEntry, CareEvent } from "@/lib/types";
import { heroImage, galleryImage, cardBackground } from "@/lib/cloudinary";
import { getCareProfile, getMonthlyTask, getCompanionAdvice, estimateHarvestDate } from "@/lib/plant-care";
import { Tooltip } from "@/components/Tooltip";
import { GrowthChart } from "./GrowthChart";

interface PlantDetailProps {
  plant: Plant;
  photos: LogEntry[];
  growthData: GrowthEntry[];
  careEvents: CareEvent[];
  onBack: () => void;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  sowed: "bg-earth-600/80 text-earth-200",
  germinated: "bg-moss-600/80 text-moss-100",
  transplanted: "bg-moss-500/80 text-moss-100",
  flowering: "bg-parchment-600/80 text-parchment-100",
  harvested: "bg-parchment-500/80 text-parchment-100",
};

const CARE_ICONS: Record<string, string> = {
  watered: "\u{1F4A7}",
  fed: "\u{1F33F}",
  pruned: "\u2702\uFE0F",
  repotted: "\u{1FAA8}",
  treated: "\u{1F48A}",
  harvested: "\u{1F33E}",
  observed: "\u{1F441}\uFE0F",
};

function daysSince(date: string): number {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function PlantDetail({
  plant,
  photos,
  growthData,
  careEvents,
  onBack,
  onRefresh,
}: PlantDetailProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("chart");
  const [logging, setLogging] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Growth form state
  const [growthForm, setGrowthForm] = useState({
    heightCm: "",
    leafCount: "",
    healthScore: 0,
    notes: "",
  });

  const careProfile = getCareProfile(plant.id);
  const monthlyTask = getMonthlyTask(plant.id);
  const companions = getCompanionAdvice(plant.id);
  const harvest = estimateHarvestDate(plant.id, plant.sowDate);
  const latestStatus = photos[0]?.status || "sowed";
  const days = daysSince(plant.sowDate);

  const sortedPhotos = [...photos].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const sortedCare = [...careEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const logCare = async (type: "watered" | "fed") => {
    setLogging(type);
    try {
      await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId: plant.id,
          type,
          date: new Date().toISOString().split("T")[0],
          notes: "",
        }),
      });
      onRefresh();
    } catch {}
    setLogging(null);
  };

  const submitGrowth = async () => {
    setLogging("growth");
    try {
      await fetch("/api/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId: plant.id,
          heightCm: growthForm.heightCm ? Number(growthForm.heightCm) : null,
          leafCount: growthForm.leafCount ? Number(growthForm.leafCount) : null,
          healthScore: growthForm.healthScore || null,
          notes: growthForm.notes,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      setGrowthForm({ heightCm: "", leafCount: "", healthScore: 0, notes: "" });
      setShowGrowthForm(false);
      onRefresh();
    } catch {}
    setLogging(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogging("photo");

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
          plantId: plant.id,
          caption: `${plant.commonName} — ${new Date().toLocaleDateString("en-GB")}`,
          status: latestStatus,
        }),
      });
      onRefresh();
    } catch {}
    setLogging(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="min-h-screen relative"
    >
      {/* Blurred photo backdrop */}
      {sortedPhotos.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <img
            src={cardBackground(sortedPhotos[0].cloudinaryUrl)}
            alt=""
            aria-hidden
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-moss-950/80 to-moss-950/95" />
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="relative z-10 flex items-center gap-1 px-4 py-3 font-mono text-xs text-moss-400 hover:text-parchment-300 transition-colors active:scale-95"
      >
        {"\u2190"} Back to garden
      </button>

      {/* Photo carousel — full width, taller */}
      {sortedPhotos.length > 0 && (
        <div className="relative z-10 mb-4">
          <div className="overflow-x-auto flex gap-2 px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
            {sortedPhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightboxUrl(galleryImage(photo.cloudinaryUrl))}
                className="min-w-[85vw] max-w-[400px] snap-start flex-shrink-0 rounded-xl overflow-hidden"
              >
                <img
                  src={heroImage(photo.cloudinaryUrl)}
                  alt={photo.caption}
                  className="w-full h-[50vh] max-h-[400px] object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          {/* Dot indicators */}
          {sortedPhotos.length > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {sortedPhotos.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === 0 ? "bg-parchment-400" : "bg-moss-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plant info */}
      <div className="relative z-10 px-4 mb-4">
        <div className="bg-moss-800/40 border border-moss-700/30 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="font-display text-2xl text-parchment-200">
                {plant.commonName}
              </h1>
              {plant.variety && (
                <p className="font-mono text-[10px] text-moss-400">{plant.variety}</p>
              )}
              {plant.latinName && (
                <p className="font-body text-xs text-moss-500 italic">{plant.latinName}</p>
              )}
            </div>
            <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_STYLES[latestStatus] || "bg-moss-700/60 text-moss-300"}`}>
              {latestStatus}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center">
              <div className="font-display text-lg text-parchment-200">{days}</div>
              <div className="font-mono text-[8px] text-moss-500 uppercase">Days</div>
            </div>
            <div className="text-center">
              <div className="font-display text-lg text-parchment-200">{sortedPhotos.length}</div>
              <div className="font-mono text-[8px] text-moss-500 uppercase">Photos</div>
            </div>
            <div className="text-center">
              <div className="font-display text-lg text-parchment-200">{sortedCare.length}</div>
              <div className="font-mono text-[8px] text-moss-500 uppercase">Care Logs</div>
            </div>
          </div>

          {harvest && (
            <div className="mt-3 pt-3 border-t border-moss-700/20">
              <p className="font-mono text-[10px] text-parchment-400">
                {"\u{1F33E}"} Estimated harvest in {harvest.daysRemaining} days ({harvest.estimated})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="relative z-10 px-4 space-y-3 mb-24">
        {/* Growth Chart */}
        <button
          onClick={() => toggleSection("chart")}
          className="w-full flex items-center justify-between py-2"
        >
          <h3 className="font-mono text-[11px] text-parchment-300 uppercase tracking-wider">
            {"\u{1F4CA}"} Growth Data
          </h3>
          <span className="font-mono text-xs text-moss-500">
            {expandedSection === "chart" ? "\u2212" : "+"}
          </span>
        </button>
        <AnimatePresence>
          {expandedSection === "chart" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <GrowthChart data={growthData} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Care Timeline */}
        <button
          onClick={() => toggleSection("care")}
          className="w-full flex items-center justify-between py-2"
        >
          <h3 className="font-mono text-[11px] text-parchment-300 uppercase tracking-wider">
            {"\u{1F4A7}"} Care History
          </h3>
          <span className="font-mono text-xs text-moss-500">
            {expandedSection === "care" ? "\u2212" : "+"}
          </span>
        </button>
        <AnimatePresence>
          {expandedSection === "care" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {sortedCare.length === 0 ? (
                <div className="bg-moss-800/20 border border-moss-700/20 rounded-xl p-4 text-center">
                  <p className="font-mono text-xs text-moss-500">No care events logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedCare.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="bg-moss-800/20 border border-moss-700/15 rounded-lg px-3 py-2 flex items-center gap-3"
                    >
                      <span className="text-sm">{CARE_ICONS[event.type] || "\u{1F33F}"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] text-parchment-300 capitalize">
                          {event.type}
                        </p>
                        {event.notes && (
                          <p className="font-body text-[10px] text-moss-400 truncate">
                            {event.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-moss-600 whitespace-nowrap">
                        {new Date(event.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Knowledge Base */}
        {careProfile && (
          <>
            <button
              onClick={() => toggleSection("knowledge")}
              className="w-full flex items-center justify-between py-2"
            >
              <h3 className="font-mono text-[11px] text-parchment-300 uppercase tracking-wider">
                {"\u{1F4D6}"} Care Guide
              </h3>
              <span className="font-mono text-xs text-moss-500">
                {expandedSection === "knowledge" ? "\u2212" : "+"}
              </span>
            </button>
            <AnimatePresence>
              {expandedSection === "knowledge" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  {/* This month's task */}
                  {monthlyTask && (
                    <div className="bg-moss-800/20 border border-moss-700/20 rounded-xl p-4">
                      <div className="font-mono text-[9px] text-moss-400 uppercase tracking-wider mb-1">
                        This Month
                      </div>
                      <p className="font-body text-xs text-parchment-300 leading-relaxed">
                        {monthlyTask}
                      </p>
                    </div>
                  )}

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-moss-800/15 rounded-lg p-3">
                      <div className="font-mono text-[8px] text-moss-500 uppercase mb-1">
                        <Tooltip term="liquid feed">Water</Tooltip>
                      </div>
                      <p className="font-body text-xs text-parchment-400">{careProfile.wateringNeeds}</p>
                    </div>
                    <div className="bg-moss-800/15 rounded-lg p-3">
                      <div className="font-mono text-[8px] text-moss-500 uppercase mb-1">Sun</div>
                      <p className="font-body text-xs text-parchment-400">{careProfile.sunRequirement}</p>
                    </div>
                    <div className="bg-moss-800/15 rounded-lg p-3">
                      <div className="font-mono text-[8px] text-moss-500 uppercase mb-1">
                        <Tooltip term="pH">Soil pH</Tooltip>
                      </div>
                      <p className="font-body text-xs text-parchment-400">
                        {careProfile.soilPH.min} - {careProfile.soilPH.max}
                      </p>
                    </div>
                    <div className="bg-moss-800/15 rounded-lg p-3">
                      <div className="font-mono text-[8px] text-moss-500 uppercase mb-1">
                        <Tooltip term="NPK">Feed</Tooltip>
                      </div>
                      <p className="font-body text-[10px] text-parchment-400 line-clamp-2">
                        {careProfile.feedingSchedule}
                      </p>
                    </div>
                  </div>

                  {/* Companions */}
                  {companions && (
                    <div className="bg-moss-800/20 border border-moss-700/20 rounded-xl p-4">
                      <div className="font-mono text-[9px] text-moss-400 uppercase tracking-wider mb-2">
                        <Tooltip term="companion planting">Companion Planting</Tooltip>
                      </div>
                      {companions.good.length > 0 && (
                        <p className="font-body text-[11px] text-parchment-400/80 mb-1">
                          {"\u2705"} Good: {companions.good.join(", ")}
                        </p>
                      )}
                      {companions.bad.length > 0 && (
                        <p className="font-body text-[11px] text-parchment-400/60">
                          {"\u274C"} Avoid: {companions.bad.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Common problems */}
                  {careProfile.commonProblems.length > 0 && (
                    <div className="bg-moss-800/20 border border-moss-700/20 rounded-xl p-4">
                      <div className="font-mono text-[9px] text-moss-400 uppercase tracking-wider mb-2">
                        Common Problems
                      </div>
                      <div className="space-y-2">
                        {careProfile.commonProblems.map((prob, i) => (
                          <div key={i} className="border-l-2 border-parchment-600/30 pl-3">
                            <p className="font-body text-xs text-parchment-300 font-medium">
                              {prob.problem}
                            </p>
                            <p className="font-body text-[10px] text-moss-400">
                              {prob.symptoms}
                            </p>
                            <p className="font-body text-[10px] text-moss-500">
                              Fix: {prob.treatment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-night-950/95 border-t border-moss-800/50 backdrop-blur-sm z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={() => logCare("watered")}
            disabled={logging === "watered"}
            className="flex-1 bg-blue-900/30 border border-blue-700/30 text-blue-300 font-mono text-[10px] py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {logging === "watered" ? "..." : "\u{1F4A7} Water"}
          </button>
          <button
            onClick={() => logCare("fed")}
            disabled={logging === "fed"}
            className="flex-1 bg-green-900/30 border border-green-700/30 text-green-300 font-mono text-[10px] py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {logging === "fed" ? "..." : "\u{1F33F} Feed"}
          </button>
          <button
            onClick={() => setShowGrowthForm(!showGrowthForm)}
            className="flex-1 bg-parchment-900/20 border border-parchment-700/30 text-parchment-300 font-mono text-[10px] py-2.5 rounded-lg active:scale-95 transition-transform"
          >
            {"\u{1F4CF}"} Measure
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={logging === "photo"}
            className="flex-1 bg-moss-800/40 border border-moss-700/30 text-moss-300 font-mono text-[10px] py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {logging === "photo" ? "..." : "\u{1F4F7} Photo"}
          </button>
        </div>
      </div>

      {/* Hidden file input for photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Growth form overlay */}
      <AnimatePresence>
        {showGrowthForm && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-16 left-0 right-0 bg-night-950/98 border-t border-moss-700/40 z-30 px-4 py-4"
          >
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[11px] text-parchment-300 uppercase tracking-wider">
                  Log Growth
                </h3>
                <button
                  onClick={() => setShowGrowthForm(false)}
                  className="font-mono text-xs text-moss-500"
                >
                  {"\u2715"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[9px] text-moss-500 uppercase">Height (cm)</label>
                  <input
                    type="number"
                    value={growthForm.heightCm}
                    onChange={(e) => setGrowthForm({ ...growthForm, heightCm: e.target.value })}
                    className="w-full bg-night-900/60 border border-moss-800/50 rounded-lg px-3 py-2 text-parchment-300 font-mono text-sm mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] text-moss-500 uppercase">Leaves</label>
                  <input
                    type="number"
                    value={growthForm.leafCount}
                    onChange={(e) => setGrowthForm({ ...growthForm, leafCount: e.target.value })}
                    className="w-full bg-night-900/60 border border-moss-800/50 rounded-lg px-3 py-2 text-parchment-300 font-mono text-sm mt-1"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="font-mono text-[9px] text-moss-500 uppercase">Health</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setGrowthForm({ ...growthForm, healthScore: score })}
                      className={`w-10 h-10 rounded-lg font-mono text-sm transition-colors ${
                        growthForm.healthScore >= score
                          ? "bg-moss-600 text-parchment-200"
                          : "bg-moss-800/30 text-moss-600"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={submitGrowth}
                disabled={logging === "growth"}
                className="w-full bg-moss-700 hover:bg-moss-600 text-parchment-200 font-mono text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {logging === "growth" ? "Saving..." : "Save Measurement"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              className="absolute top-6 right-6 font-mono text-sm text-white/60 hover:text-white transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
