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
  sowed: "bg-garden-greenLight text-garden-text",
  germinated: "bg-garden-greenLight text-garden-green",
  transplanted: "bg-garden-greenLight text-garden-green",
  flowering: "bg-garden-greenLight text-garden-text",
  harvested: "bg-garden-greenLight text-garden-text",
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
      className="min-h-screen relative bg-white"
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
          <div className="absolute inset-0 bg-white/90" />
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="relative z-10 flex items-center gap-1 px-4 py-3 min-h-[48px] min-w-[48px] font-sans text-base text-garden-textMuted hover:text-garden-text transition-colors active:scale-95"
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
                className="min-w-[85vw] max-w-[400px] snap-start flex-shrink-0 rounded-xl overflow-hidden min-h-[48px] min-w-[48px]"
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
                    i === 0 ? "bg-garden-greenBright" : "bg-garden-border"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plant info */}
      <div className="relative z-10 px-4 mb-4">
        <div className="bg-garden-greenLight border border-garden-border rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="font-sans font-bold text-2xl text-garden-text">
                {plant.commonName}
              </h1>
              {plant.variety && (
                <p className="font-sans text-base text-garden-textMuted">{plant.variety}</p>
              )}
              {plant.latinName && (
                <p className="font-sans text-base text-garden-textMuted italic">{plant.latinName}</p>
              )}
            </div>
            <span className={`font-sans text-sm uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_STYLES[latestStatus] || "bg-garden-greenLight text-garden-text"}`}>
              {latestStatus}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center">
              <div className="font-sans font-bold text-lg text-garden-text">{days}</div>
              <div className="font-sans text-sm text-garden-textMuted uppercase">Days</div>
            </div>
            <div className="text-center">
              <div className="font-sans font-bold text-lg text-garden-text">{sortedPhotos.length}</div>
              <div className="font-sans text-sm text-garden-textMuted uppercase">Photos</div>
            </div>
            <div className="text-center">
              <div className="font-sans font-bold text-lg text-garden-text">{sortedCare.length}</div>
              <div className="font-sans text-sm text-garden-textMuted uppercase">Care Logs</div>
            </div>
          </div>

          {harvest && (
            <div className="mt-3 pt-3 border-t border-garden-border">
              <p className="font-sans text-base text-garden-text">
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
          className="w-full flex items-center justify-between py-2 min-h-[48px]"
        >
          <h3 className="font-sans text-base text-garden-text uppercase tracking-wider">
            {"\u{1F4CA}"} Growth Data
          </h3>
          <span className="font-sans text-base text-garden-textMuted">
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
          className="w-full flex items-center justify-between py-2 min-h-[48px]"
        >
          <h3 className="font-sans text-base text-garden-text uppercase tracking-wider">
            {"\u{1F4A7}"} Care History
          </h3>
          <span className="font-sans text-base text-garden-textMuted">
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
                <div className="bg-garden-greenLight border border-garden-border rounded-xl p-4 text-center">
                  <p className="font-sans text-base text-garden-textMuted">No care events logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedCare.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="bg-garden-greenLight border border-garden-border rounded-lg px-3 py-2 flex items-center gap-3"
                    >
                      <span className="text-sm">{CARE_ICONS[event.type] || "\u{1F33F}"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-sans text-base text-garden-text capitalize">
                          {event.type}
                        </p>
                        {event.notes && (
                          <p className="font-sans text-base text-garden-textMuted truncate">
                            {event.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-sans text-sm text-garden-textMuted whitespace-nowrap">
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
              className="w-full flex items-center justify-between py-2 min-h-[48px]"
            >
              <h3 className="font-sans text-base text-garden-text uppercase tracking-wider">
                {"\u{1F4D6}"} Care Guide
              </h3>
              <span className="font-sans text-base text-garden-textMuted">
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
                    <div className="bg-garden-greenLight border border-garden-border rounded-xl p-4">
                      <div className="font-sans text-sm text-garden-textMuted uppercase tracking-wider mb-1">
                        This Month
                      </div>
                      <p className="font-sans text-base text-garden-text leading-relaxed">
                        {monthlyTask}
                      </p>
                    </div>
                  )}

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-garden-greenLight rounded-lg p-3">
                      <div className="font-sans text-sm text-garden-textMuted uppercase mb-1">
                        <Tooltip term="liquid feed">Water</Tooltip>
                      </div>
                      <p className="font-sans text-base text-garden-text">{careProfile.wateringNeeds}</p>
                    </div>
                    <div className="bg-garden-greenLight rounded-lg p-3">
                      <div className="font-sans text-sm text-garden-textMuted uppercase mb-1">Sun</div>
                      <p className="font-sans text-base text-garden-text">{careProfile.sunRequirement}</p>
                    </div>
                    <div className="bg-garden-greenLight rounded-lg p-3">
                      <div className="font-sans text-sm text-garden-textMuted uppercase mb-1">
                        <Tooltip term="pH">Soil pH</Tooltip>
                      </div>
                      <p className="font-sans text-base text-garden-text">
                        {careProfile.soilPH.min} - {careProfile.soilPH.max}
                      </p>
                    </div>
                    <div className="bg-garden-greenLight rounded-lg p-3">
                      <div className="font-sans text-sm text-garden-textMuted uppercase mb-1">
                        <Tooltip term="NPK">Feed</Tooltip>
                      </div>
                      <p className="font-sans text-base text-garden-text line-clamp-2">
                        {careProfile.feedingSchedule}
                      </p>
                    </div>
                  </div>

                  {/* Companions */}
                  {companions && (
                    <div className="bg-garden-greenLight border border-garden-border rounded-xl p-4">
                      <div className="font-sans text-sm text-garden-textMuted uppercase tracking-wider mb-2">
                        <Tooltip term="companion planting">Companion Planting</Tooltip>
                      </div>
                      {companions.good.length > 0 && (
                        <p className="font-sans text-base text-garden-text mb-1">
                          {"\u2705"} Good: {companions.good.join(", ")}
                        </p>
                      )}
                      {companions.bad.length > 0 && (
                        <p className="font-sans text-base text-garden-textMuted">
                          {"\u274C"} Avoid: {companions.bad.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Common problems */}
                  {careProfile.commonProblems.length > 0 && (
                    <div className="bg-garden-greenLight border border-garden-border rounded-xl p-4">
                      <div className="font-sans text-sm text-garden-textMuted uppercase tracking-wider mb-2">
                        Common Problems
                      </div>
                      <div className="space-y-2">
                        {careProfile.commonProblems.map((prob, i) => (
                          <div key={i} className="border-l-2 border-garden-border pl-3">
                            <p className="font-sans text-base text-garden-text font-medium">
                              {prob.problem}
                            </p>
                            <p className="font-sans text-base text-garden-textMuted">
                              {prob.symptoms}
                            </p>
                            <p className="font-sans text-base text-garden-textMuted">
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-garden-border backdrop-blur-sm z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={() => logCare("watered")}
            disabled={logging === "watered"}
            className="flex-1 bg-garden-greenBright text-white font-sans text-base min-h-[48px] py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50 hover:bg-garden-green"
          >
            {logging === "watered" ? "..." : "\u{1F4A7} Water"}
          </button>
          <button
            onClick={() => logCare("fed")}
            disabled={logging === "fed"}
            className="flex-1 bg-garden-greenBright text-white font-sans text-base min-h-[48px] py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50 hover:bg-garden-green"
          >
            {logging === "fed" ? "..." : "\u{1F33F} Feed"}
          </button>
          <button
            onClick={() => setShowGrowthForm(!showGrowthForm)}
            className="flex-1 bg-garden-greenBright text-white font-sans text-base min-h-[48px] py-2.5 rounded-lg active:scale-95 transition-transform hover:bg-garden-green"
          >
            {"\u{1F4CF}"} Measure
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={logging === "photo"}
            className="flex-1 bg-garden-greenBright text-white font-sans text-base min-h-[48px] py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50 hover:bg-garden-green"
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
            className="fixed bottom-16 left-0 right-0 bg-white border-t border-garden-border z-30 px-4 py-4"
          >
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-base text-garden-text uppercase tracking-wider">
                  Log Growth
                </h3>
                <button
                  onClick={() => setShowGrowthForm(false)}
                  className="font-sans text-base text-garden-textMuted min-h-[48px] min-w-[48px]"
                >
                  {"\u2715"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-sans text-sm text-garden-textMuted uppercase">Height (cm)</label>
                  <input
                    type="number"
                    value={growthForm.heightCm}
                    onChange={(e) => setGrowthForm({ ...growthForm, heightCm: e.target.value })}
                    className="w-full bg-garden-offwhite border border-garden-border rounded-lg px-3 py-2 text-garden-text font-sans text-base mt-1 min-h-[48px]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="font-sans text-sm text-garden-textMuted uppercase">Leaves</label>
                  <input
                    type="number"
                    value={growthForm.leafCount}
                    onChange={(e) => setGrowthForm({ ...growthForm, leafCount: e.target.value })}
                    className="w-full bg-garden-offwhite border border-garden-border rounded-lg px-3 py-2 text-garden-text font-sans text-base mt-1 min-h-[48px]"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="font-sans text-sm text-garden-textMuted uppercase">Health</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setGrowthForm({ ...growthForm, healthScore: score })}
                      className={`w-12 h-12 min-h-[48px] min-w-[48px] rounded-lg font-sans text-base transition-colors ${
                        growthForm.healthScore >= score
                          ? "bg-garden-greenBright text-white"
                          : "bg-garden-greenLight text-garden-textMuted"
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
                className="w-full bg-garden-greenBright hover:bg-garden-green text-white font-sans text-base py-2.5 rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
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
              className="absolute top-6 right-6 font-sans text-base text-white/60 hover:text-white transition-colors min-h-[48px] min-w-[48px]"
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
