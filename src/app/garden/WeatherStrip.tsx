"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { WeatherSnapshot } from "@/lib/types";

interface WeatherStripProps {
  current: WeatherSnapshot;
  daily: (WeatherSnapshot & { gardeningContext: string })[];
  frostAlert: string | null;
  wateringAdvice: string;
}

const WEATHER_ICONS: Record<string, string> = {
  clear: "\u2600\uFE0F",
  "partly-cloudy": "\u26C5",
  cloudy: "\u2601\uFE0F",
  rain: "\u{1F327}\uFE0F",
  "heavy-rain": "\u26C8\uFE0F",
  drizzle: "\u{1F326}\uFE0F",
  snow: "\u2744\uFE0F",
  fog: "\u{1F32B}\uFE0F",
  thunderstorm: "\u26A1",
};

export function WeatherStrip({ current, daily, frostAlert, wateringAdvice }: WeatherStripProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = WEATHER_ICONS[current.condition] || "\u{1F324}\uFE0F";

  return (
    <div className="mb-4">
      {/* Frost alert banner */}
      {frostAlert && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-3"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="font-sans text-base text-red-700 leading-snug">
              {frostAlert}
            </span>
          </div>
        </motion.div>
      )}

      {/* Main weather bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-garden-greenLight border border-garden-border rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <span className="font-sans font-bold text-2xl text-garden-text">
              {Math.round(current.tempCurrent)}°
            </span>
            <span className="font-sans text-base text-garden-textMuted ml-2 uppercase">
              Bristol
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-sans text-base text-garden-textMuted">
            H:{Math.round(current.tempMax)}° L:{Math.round(current.tempMin)}°
          </div>
          <div className="font-sans text-base text-garden-textMuted">
            {"\u{1F4A7}"} {current.humidity}% {"\u{1F32C}\uFE0F"} {Math.round(current.windSpeed)}km/h
          </div>
        </div>
      </button>

      {/* Expanded: 3-day forecast + watering advice */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-garden-greenLight border border-garden-border rounded-xl mt-2 p-4">
              {/* 3-day strip */}
              <div className="flex gap-2 mb-3">
                {daily.slice(0, 5).map((day, i) => {
                  const dayIcon = WEATHER_ICONS[day.condition] || "\u{1F324}\uFE0F";
                  const dayName = i === 0
                    ? "Today"
                    : new Date(day.date).toLocaleDateString("en-GB", { weekday: "short" });
                  return (
                    <div key={day.date} className="flex-1 text-center">
                      <div className="font-sans text-sm text-garden-textMuted mb-1">{dayName}</div>
                      <div className="text-sm mb-1">{dayIcon}</div>
                      <div className="font-sans text-base text-garden-text">
                        {Math.round(day.tempMax)}°
                      </div>
                      <div className="font-sans text-sm text-garden-textMuted">
                        {Math.round(day.tempMin)}°
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Watering advice */}
              <div className="border-t border-garden-border pt-3">
                <div className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
                  {"\u{1F4A7}"} Watering
                </div>
                <p className="font-sans text-base text-garden-textMuted leading-relaxed">
                  {wateringAdvice}
                </p>
              </div>

              {/* Today's gardening context */}
              {daily[0] && (
                <div className="border-t border-garden-border pt-3 mt-3">
                  <div className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
                    {"\u{1F33F}"} Today
                  </div>
                  <p className="font-sans text-base text-garden-textMuted">
                    {daily[0].gardeningContext}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
