"use client";

import { useState, useCallback, useEffect } from "react";
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-moss-600 border-t-parchment-400 rounded-full animate-spin" />
          <p className="font-mono text-xs text-moss-500 mt-3">
            The gardener is thinking...
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

  // --- Dashboard view ---
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-moss-800/50 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-parchment-200">
            Garden Portal
          </h1>
          <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider">
            AI Gardener
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPhotoJournal(true)}
            className="font-mono text-xs text-moss-400 hover:text-parchment-300 transition-colors"
          >
            {"\u{1F4F7}"}
          </button>
          <a
            href="/"
            className="font-mono text-xs text-moss-400 hover:text-parchment-300 transition-colors"
          >
            View Site {"\u2192"}
          </a>
          <button
            onClick={handleLogout}
            className="font-mono text-xs text-moss-400 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Scrollable dashboard */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
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
