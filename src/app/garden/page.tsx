"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Plant, LogEntry, GrowthEntry, CareEvent, AdviceEntry, WeatherSnapshot } from "@/lib/types";
import { WeatherStrip } from "./WeatherStrip";
import { PriorityStrip } from "./PriorityStrip";
import { PlantGrid } from "./PlantGrid";
import { WeekTimeline } from "./WeekTimeline";
import { QuickStats } from "./QuickStats";
import { QuickActions } from "./QuickActions";
import { PlantDetail } from "./PlantDetail";
import { PhotoJournal } from "./PhotoJournal";

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
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [showPhotoJournal, setShowPhotoJournal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {}
  }, []);

  const handleAuth = async () => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setError("");
        setLoading(true);
        await fetchData();
        setLoading(false);
      } else {
        setError("Wrong password");
      }
    } catch {
      setError("Connection failed \u2014 try again");
    }
  };

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // --- Auth screen ---
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="max-w-sm mx-auto pt-20 px-6">
          <div className="text-center mb-8">
            <span className="text-4xl block mb-3">{"\u{1F33F}"}</span>
            <h2 className="font-display text-4xl text-parchment-200 mb-2">
              Garden Portal
            </h2>
            <p className="font-mono text-xs text-moss-500">
              Your AI gardening companion
            </p>
          </div>
          <div className="bg-night-900/40 border border-moss-800/30 rounded-lg p-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-4 py-3 text-parchment-300 font-body text-base focus:outline-none focus:border-moss-600 mb-4"
              placeholder="Password"
              autoFocus
            />
            {error && (
              <p className="font-mono text-xs text-red-400 mb-4">{error}</p>
            )}
            <button
              onClick={handleAuth}
              className="w-full bg-moss-700 hover:bg-moss-600 text-parchment-200 font-mono text-sm py-3 rounded-lg transition-colors active:scale-95"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // --- Photo Journal view ---
  if (showPhotoJournal) {
    return (
      <PhotoJournal
        logs={data.logs}
        plants={data.plants}
        password={password}
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
          password={password}
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
          password={password}
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
        password={password}
        onRefresh={refreshData}
        onShowPhotos={() => setShowPhotoJournal(true)}
      />
    </div>
  );
}
