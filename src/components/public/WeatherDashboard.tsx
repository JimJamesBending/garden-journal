"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

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
  }>;
  advice: {
    watering: string;
    frostAlert: string | null;
  };
}

function getWeatherIcon(condition: string, large = false): string {
  const size = large ? "text-5xl" : "text-2xl";
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
  if (i === 1) return "Tomorrow";
  return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "short" });
}

function getDaylightHours(sunrise: string, sunset: string): string {
  if (!sunrise || !sunset) return "";
  const [sh, sm] = sunrise.split(":").map(Number);
  const [eh, em] = sunset.split(":").map(Number);
  const hours = eh - sh + (em - sm) / 60;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
}

export function WeatherDashboard({ weather }: { weather: WeatherData | null }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  if (!weather) return null;

  const { current, daily, advice } = weather;
  const daylightHours = getDaylightHours(current.sunrise, current.sunset);

  return (
    <section ref={ref} className="py-24 px-6 bg-moss-950/50">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-mono text-xs text-moss-500 uppercase tracking-[0.3em]">
            Live from Bristol
          </span>
          <h2 className="font-display text-5xl md:text-6xl font-light text-parchment-200 mt-3 mb-4">
            Weather & Growing Conditions
          </h2>
        </motion.div>

        {/* Frost alert banner */}
        {advice.frostAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="mb-8 p-4 rounded-xl bg-red-900/30 border border-red-700/40 flex items-start gap-3"
          >
            <span className="text-xl flex-shrink-0">{"\u{26A0}\u{FE0F}"}</span>
            <div>
              <p className="font-mono text-xs text-red-300 uppercase tracking-wider mb-1">Frost Alert</p>
              <p className="font-body text-sm text-red-200/80">{advice.frostAlert}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current conditions — large card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="lg:col-span-1 bg-moss-800/40 rounded-2xl border border-moss-700/30 p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <motion.span
                className="text-5xl"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                {getWeatherIcon(current.condition)}
              </motion.span>
              <div>
                <p className="font-display text-5xl text-parchment-200 font-light">
                  {Math.round(current.tempCurrent)}°
                </p>
                <p className="font-mono text-xs text-moss-400 capitalize">
                  {current.condition.replace("-", " ")}
                </p>
              </div>
            </div>

            {/* Weather details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-moss-900/50 rounded-xl p-3">
                <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">High / Low</p>
                <p className="font-display text-lg text-parchment-300">
                  {Math.round(current.tempMax)}° / {Math.round(current.tempMin)}°
                </p>
              </div>
              <div className="bg-moss-900/50 rounded-xl p-3">
                <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">Humidity</p>
                <p className="font-display text-lg text-parchment-300">
                  {current.humidity}%
                </p>
              </div>
              <div className="bg-moss-900/50 rounded-xl p-3">
                <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">Wind</p>
                <p className="font-display text-lg text-parchment-300">
                  {Math.round(current.windSpeed)} km/h
                </p>
              </div>
              <div className="bg-moss-900/50 rounded-xl p-3">
                <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">UV Index</p>
                <p className="font-display text-lg text-parchment-300">
                  {current.uvIndex}
                </p>
              </div>
              <div className="bg-moss-900/50 rounded-xl p-3">
                <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">Soil Temp</p>
                <p className="font-display text-lg text-parchment-300">
                  {Math.round(current.soilTemp10cm)}°C
                </p>
              </div>
              <div className="bg-moss-900/50 rounded-xl p-3">
                <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">Daylight</p>
                <p className="font-display text-lg text-parchment-300">
                  {daylightHours}
                </p>
              </div>
            </div>

            {/* Sunrise/Sunset */}
            <div className="mt-4 flex items-center justify-between font-mono text-xs text-moss-400">
              <span>{"\u{1F305}"} {current.sunrise}</span>
              <div className="flex-1 mx-3 h-px bg-gradient-to-r from-parchment-600/30 via-parchment-400/50 to-parchment-600/30" />
              <span>{"\u{1F307}"} {current.sunset}</span>
            </div>
          </motion.div>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* 7-day forecast strip */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="bg-moss-800/40 rounded-2xl border border-moss-700/30 p-6"
            >
              <p className="font-mono text-xs text-moss-500 uppercase tracking-wider mb-4">
                7-Day Forecast
              </p>
              <div className="grid grid-cols-7 gap-2">
                {daily.slice(0, 7).map((day, i) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }}
                    className={`text-center p-3 rounded-xl ${
                      i === 0
                        ? "bg-moss-700/40 border border-moss-600/30"
                        : "bg-moss-900/30"
                    } ${day.frostRisk ? "ring-1 ring-red-800/40" : ""}`}
                  >
                    <p className="font-mono text-[10px] text-moss-400 mb-2">
                      {getDayName(day.date, i)}
                    </p>
                    <p className="text-xl mb-2">{getWeatherIcon(day.condition)}</p>
                    <p className="font-mono text-xs text-parchment-300">
                      {Math.round(day.tempMax)}°
                    </p>
                    <p className="font-mono text-[10px] text-moss-500">
                      {Math.round(day.tempMin)}°
                    </p>
                    {day.precipitation > 0 && (
                      <p className="font-mono text-[10px] text-blue-400 mt-1">
                        {day.precipitation.toFixed(1)}mm
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Watering advice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="bg-moss-800/40 rounded-2xl border border-moss-700/30 p-6"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{"\u{1F4A7}"}</span>
                <div>
                  <p className="font-mono text-xs text-moss-500 uppercase tracking-wider mb-2">
                    Watering Advice
                  </p>
                  <p className="font-body text-sm text-parchment-400/80">
                    {advice.watering}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Gardening conditions for next 3 days */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="bg-moss-800/40 rounded-2xl border border-moss-700/30 p-6"
            >
              <p className="font-mono text-xs text-moss-500 uppercase tracking-wider mb-4">
                Gardening Conditions
              </p>
              <div className="space-y-3">
                {daily.slice(0, 3).map((day, i) => (
                  <div
                    key={day.date}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="font-mono text-xs text-moss-400 w-20">
                      {getDayName(day.date, i)}
                    </span>
                    <span className="text-lg">{getWeatherIcon(day.condition)}</span>
                    <span className="font-body text-parchment-400/70 flex-1">
                      {day.gardeningContext || ""}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
