"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence } from "framer-motion";
import { Plant, LogEntry, GrowthEntry, CareEvent, AdviceEntry, WeatherSnapshot, Space } from "@/lib/types";
import { WeatherStrip } from "./WeatherStrip";
import { PriorityStrip } from "./PriorityStrip";
import { PlantGrid } from "./PlantGrid";
import { WeekTimeline } from "./WeekTimeline";
import { QuickStats } from "./QuickStats";
import { QuickActions } from "./QuickActions";
import { PlantDetail } from "./PlantDetail";
import { PhotoJournal } from "./PhotoJournal";
import { PhotoWizard } from "./PhotoWizard";
import Link from "next/link";

interface DashboardData {
  plants: Plant[];
  logs: LogEntry[];
  growth: GrowthEntry[];
  care: CareEvent[];
  advice: AdviceEntry[];
  weather: {
    current: WeatherSnapshot;
    daily: (WeatherSnapshot & { gardeningContext: string })[];
    advice: {
      watering: string;
      frostAlert: string | null;
    };
  } | null;
  soil: unknown[];
}

export default function GardenPortal() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [showPhotoJournal, setShowPhotoJournal] = useState(false);
  const [showPhotoWizard, setShowPhotoWizard] = useState(false);
  const pendingProcessed = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {}
  }, []);

  // --- Process pendingPlant from /try flow ---
  useEffect(() => {
    if (pendingProcessed.current) return;
    pendingProcessed.current = true;

    const raw = sessionStorage.getItem("pendingPlant");
    if (!raw) return;

    let pending: {
      plantName: string;
      latinName: string;
      variety?: string;
      category: string;
      confidence: number;
      careAdvice: string[];
      funFact: string;
      sowingTip?: string;
      sourceType: string;
      photoUrl: string | null;
      savedAt: string;
    };

    try {
      pending = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem("pendingPlant");
      return;
    }

    // Remove immediately so we don't re-process on re-render
    sessionStorage.removeItem("pendingPlant");

    const tempId = `__NEW_${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions: { type: string; data: Record<string, any> }[] = [
      {
        type: "create-plant",
        data: {
          commonName: pending.plantName,
          variety: pending.variety || "",
          latinName: pending.latinName || "",
          category: pending.category || "flower",
          sowDate: today,
          location: "outdoor",
          notes: pending.careAdvice?.join(". ") || "",
          seedSource: pending.sourceType === "photo" ? "Identified from photo" : "Text search",
          tempId,
        },
      },
    ];

    // If there's a photo, create a log entry too
    if (pending.photoUrl) {
      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: pending.photoUrl,
          plantId: tempId,
          caption: `${pending.plantName} — added from plant identifier`,
          status: "sowed",
        },
      });
    }

    fetch("/api/wizard/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    })
      .then(() => fetchData())
      .catch(() => {});
  }, [fetchData]);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // --- Loading ---
  if (loading || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-garden-greenBright border-t-garden-border rounded-full animate-spin" />
          <p className="font-sans text-base text-garden-textMuted mt-3">
            Loading your garden...
          </p>
        </div>
      </div>
    );
  }

  // --- Photo Wizard view ---
  if (showPhotoWizard) {
    return (
      <PhotoWizard
        plants={data.plants}
        logs={data.logs}
        spaces={[] as Space[]}
        onBack={() => setShowPhotoWizard(false)}
        onRefresh={refreshData}
      />
    );
  }

  // --- Photo Journal view ---
  if (showPhotoJournal) {
    return (
      <PhotoJournal
        logs={data.logs}
        plants={data.plants}
        onBack={() => setShowPhotoJournal(false)}
        onRefresh={refreshData}
      />
    );
  }

  // --- Plant Detail view ---
  if (selectedPlantId) {
    const plant = data.plants.find((p) => p.id === selectedPlantId);
    if (!plant) {
      setSelectedPlantId(null);
      return null;
    }

    return (
      <AnimatePresence mode="wait">
        <PlantDetail
          key={selectedPlantId}
          plant={plant}
          photos={data.logs.filter(
            (l) => l.plantId === selectedPlantId && l.labeled && l.cloudinaryUrl
          )}
          growthData={data.growth.filter((g) => g.plantId === selectedPlantId)}
          careEvents={data.care.filter((e) => e.plantId === selectedPlantId)}
          onBack={() => setSelectedPlantId(null)}
          onRefresh={refreshData}
        />
      </AnimatePresence>
    );
  }

  // --- Empty state ---
  const hasPlants = data.plants.length > 0;

  // --- Dashboard view ---
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-garden-border bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-sans font-bold text-[22px] leading-tight text-garden-text">
            My Garden
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPhotoJournal(true)}
            className="font-sans text-base text-garden-textMuted hover:text-garden-text transition-colors"
          >
            Photos
          </button>
          <button
            onClick={handleLogout}
            className="font-sans text-base text-garden-textMuted hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Scrollable dashboard */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-28">
        {!hasPlants ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-6">&#x1F331;</div>
            <h2 className="font-sans font-bold text-[22px] text-garden-text mb-2">
              Your garden is empty!
            </h2>
            <p className="font-sans text-base text-garden-textMuted mb-8 max-w-xs">
              Add your first plant to start tracking your garden journey.
            </p>
            <Link
              href="/try"
              className="inline-flex items-center justify-center bg-garden-greenBright hover:bg-garden-green text-white font-sans font-semibold text-lg px-8 py-4 rounded-xl min-h-[48px] transition-colors shadow-sm"
            >
              Add your first plant
            </Link>
          </div>
        ) : (
          <>
            {/* Weather */}
            {data.weather && (
              <WeatherStrip
                current={data.weather.current}
                daily={data.weather.daily}
                frostAlert={data.weather.advice.frostAlert}
                wateringAdvice={data.weather.advice.watering}
              />
            )}

            {/* Priority items */}
            <PriorityStrip
              advice={data.advice}
              plants={data.plants}
              logs={data.logs}
              onRefresh={refreshData}
            />

            {/* Plant grid */}
            <PlantGrid
              plants={data.plants}
              logs={data.logs}
              growth={data.growth}
              care={data.care}
              onSelectPlant={setSelectedPlantId}
            />

            {/* Quick stats */}
            <QuickStats
              plants={data.plants}
              logs={data.logs}
              care={data.care}
              growth={data.growth}
            />

            {/* Week timeline */}
            {data.weather && (
              <WeekTimeline
                advice={data.advice}
                daily={data.weather.daily}
              />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <QuickActions
        plants={data.plants}
        logs={data.logs}
        onRefresh={refreshData}
        onShowPhotos={() => setShowPhotoJournal(true)}
        onShowWizard={() => setShowPhotoWizard(true)}
      />
    </div>
  );
}
