"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Tooltip } from "@/components/Tooltip";

interface WeatherData {
  current: {
    tempCurrent: number;
    tempMax: number;
    tempMin: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    soilTemp10cm: number;
    soilMoisture: number;
    sunrise: string;
    sunset: string;
    condition: string;
    frostRisk: boolean;
    precipitation: number;
  };
  daily: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    condition: string;
    frostRisk: boolean;
    gardeningContext?: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    soilTemp10cm: number;
    soilMoisture: number;
    sunrise: string;
    sunset: string;
  }>;
  advice: {
    watering: string;
    frostAlert: string | null;
  };
}

function getWeatherIcon(condition: string): string {
  const icons: Record<string, string> = {
    clear: "\u{2600}\u{FE0F}",
    "partly-cloudy": "\u{26C5}",
    cloudy: "\u{2601}\u{FE0F}",
    rain: "\u{1F327}\u{FE0F}",
    "heavy-rain": "\u{26C8}\u{FE0F}",
    drizzle: "\u{1F326}\u{FE0F}",
    snow: "\u{2744}\u{FE0F}",
    fog: "\u{1F32B}\u{FE0F}",
    thunderstorm: "\u{26A1}",
  };
  return icons[condition] || "\u{2601}\u{FE0F}";
}

function getDayName(dateStr: string, i: number): string {
  if (i === 0) return "Today";
  if (i === 1) return "Tmrw";
  return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "short" });
}

export function WeatherDashboard({ weather }: { weather: WeatherData | null }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [expanded, setExpanded] = useState(false);

  if (!weather) return null;

  const { current, daily, advice } = weather;

  return (
    <section ref={ref} className="px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Compact weather strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="bg-white rounded-2xl border border-garden-border overflow-hidden"
        >
          {/* Frost alert banner */}
          {advice.frostAlert && (
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2">
              <span className="text-sm animate-pulse">{"\u{26A0}\u{FE0F}"}</span>
              <p className="font-sans text-base text-red-700">
                <Tooltip term="hardy" definition="A plant that can survive frost and cold winters outdoors without protection.">
                  Frost Alert
                </Tooltip>
                {" \u2014 "}{advice.frostAlert}
              </p>
            </div>
          )}

          {/* Main strip - clickable to expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-garden-greenLight transition-colors"
          >
            {/* Left: current conditions */}
            <div className="flex items-center gap-3">
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                {getWeatherIcon(current.condition)}
              </motion.span>
              <div className="text-left">
                <span className="font-sans font-bold text-2xl text-garden-text">
                  {Math.round(current.tempCurrent)}{"\u00B0"}C
                </span>
                <span className="font-sans text-base text-garden-textMuted block capitalize">
                  {current.condition.replace("-", " ")} in Bristol
                </span>
              </div>
            </div>

            {/* Centre: 5-day mini forecast */}
            <div className="hidden sm:flex items-center gap-3">
              {daily.slice(0, 5).map((day, i) => (
                <div
                  key={day.date}
                  className={`text-center ${day.frostRisk ? "text-red-700" : ""}`}
                >
                  <span className="font-sans text-sm text-garden-textMuted block">
                    {getDayName(day.date, i)}
                  </span>
                  <span className="text-sm block">{getWeatherIcon(day.condition)}</span>
                  <span className="font-sans text-base text-garden-text">
                    {Math.round(day.tempMax)}{"\u00B0"}
                  </span>
                </div>
              ))}
            </div>

            {/* Right: soil + expand indicator */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <span className="font-sans text-sm text-garden-textMuted block uppercase">
                  Soil
                </span>
                <span className="font-sans text-base text-garden-text">
                  {Math.round(current.soilTemp10cm)}{"\u00B0"}C
                </span>
              </div>
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                className="text-garden-textMuted text-sm"
              >
                {"\u25BC"}
              </motion.span>
            </div>
          </button>

          {/* Expanded details */}
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-garden-border"
            >
              {/* Detailed stats grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-4">
                <div className="bg-garden-greenLight rounded-xl p-3 text-center">
                  <span className="font-sans text-sm text-garden-textMuted uppercase block">High/Low</span>
                  <span className="font-sans text-base text-garden-text">
                    {Math.round(current.tempMax)}{"\u00B0"}/{Math.round(current.tempMin)}{"\u00B0"}
                  </span>
                </div>
                <div className="bg-garden-greenLight rounded-xl p-3 text-center">
                  <span className="font-sans text-sm text-garden-textMuted uppercase block">Humidity</span>
                  <span className="font-sans text-base text-garden-text">{current.humidity}%</span>
                </div>
                <div className="bg-garden-greenLight rounded-xl p-3 text-center">
                  <span className="font-sans text-sm text-garden-textMuted uppercase block">Wind</span>
                  <span className="font-sans text-base text-garden-text">{Math.round(current.windSpeed)} km/h</span>
                </div>
                <div className="bg-garden-greenLight rounded-xl p-3 text-center">
                  <span className="font-sans text-sm text-garden-textMuted uppercase block">UV</span>
                  <span className="font-sans text-base text-garden-text">{current.uvIndex}</span>
                </div>
                <div className="bg-garden-greenLight rounded-xl p-3 text-center">
                  <span className="font-sans text-sm text-garden-textMuted uppercase block">
                    <Tooltip term="pH">Soil</Tooltip>
                  </span>
                  <span className="font-sans text-base text-garden-text">{Math.round(current.soilTemp10cm)}{"\u00B0"}C</span>
                </div>
                <div className="bg-garden-greenLight rounded-xl p-3 text-center">
                  <span className="font-sans text-sm text-garden-textMuted uppercase block">Rain</span>
                  <span className="font-sans text-base text-garden-text">{current.precipitation}mm</span>
                </div>
              </div>

              {/* Watering advice */}
              <div className="px-4 pb-3 flex items-start gap-2">
                <span className="text-sm">{"\u{1F4A7}"}</span>
                <p className="font-sans text-base text-garden-textMuted">{advice.watering}</p>
              </div>

              {/* Sunrise/sunset */}
              <div className="px-4 pb-4 flex items-center justify-between font-sans text-base text-garden-textMuted">
                <span>{"\u{1F305}"} {current.sunrise}</span>
                <div className="flex-1 mx-3 h-px bg-garden-border" />
                <span>{"\u{1F307}"} {current.sunset}</span>
              </div>

              {/* Gardening conditions */}
              <div className="px-4 pb-4">
                <p className="font-sans text-sm text-garden-textMuted uppercase tracking-wider mb-2">
                  Gardening Conditions
                </p>
                <div className="space-y-1.5">
                  {daily.slice(0, 3).map((day, i) => (
                    <div key={day.date} className="flex items-center gap-2 text-base">
                      <span className="font-sans text-base text-garden-textMuted w-12">
                        {getDayName(day.date, i)}
                      </span>
                      <span className="text-sm">{getWeatherIcon(day.condition)}</span>
                      <span className="font-sans text-garden-textMuted flex-1 text-base">
                        {day.gardeningContext || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
