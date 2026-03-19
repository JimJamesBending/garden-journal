"use client";

import { useState, useEffect } from "react";
import { AdviceEntry } from "@/lib/types";

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: "border-l-red-500 bg-red-900/20",
    high: "border-l-parchment-400 bg-parchment-900/10",
    medium: "border-l-moss-400 bg-moss-800/20",
    low: "border-l-moss-600 bg-moss-800/10",
    info: "border-l-night-400 bg-night-900/20",
  };
  return colors[priority] || "border-l-moss-600 bg-moss-800/10";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "this-week": "\u{2705}",
    "coming-up": "\u{1F4C5}",
    seasonal: "\u{1F33B}",
    "weather-alert": "\u{26A0}\u{FE0F}",
    "growth-update": "\u{1F4CA}",
    problem: "\u{1F41B}",
    harvest: "\u{1F33E}",
    "buy-list": "\u{1F6D2}",
    "fun-fact": "\u{1F4A1}",
  };
  return icons[category] || "\u{1F33F}";
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "this-week": "This Week",
    "coming-up": "Coming Up",
    seasonal: "Seasonal",
    "weather-alert": "Weather Alert",
    "growth-update": "Growth Update",
    problem: "Needs Attention",
    harvest: "Harvest",
    "buy-list": "Shopping List",
    "fun-fact": "Did You Know?",
  };
  return labels[category] || category;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    urgent: "Act Now",
    high: "Important",
    medium: "This Week",
    low: "When You Can",
    info: "FYI",
  };
  return labels[priority] || priority;
}

interface WeatherPreview {
  tempCurrent: number;
  condition: string;
  frostRisk: boolean;
}

export function AdviceTab({ password }: { password: string }) {
  const [advice, setAdvice] = useState<AdviceEntry[]>([]);
  const [weather, setWeather] = useState<WeatherPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [careLogging, setCareLogging] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [advRes, wxRes] = await Promise.all([
          fetch("/api/advice"),
          fetch("/api/weather"),
        ]);

        if (advRes.ok) {
          const data = await advRes.json();
          setAdvice(data);
        }

        if (wxRes.ok) {
          const wxData = await wxRes.json();
          setWeather({
            tempCurrent: wxData.current.tempCurrent,
            condition: wxData.current.condition,
            frostRisk: wxData.current.frostRisk,
          });
        }
      } catch (e) {
        console.error("Failed to load advice:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const logCareEvent = async (
    plantId: string,
    type: string
  ) => {
    setCareLogging(plantId + type);
    try {
      await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId, type, password }),
      });
    } catch {}
    setCareLogging(null);
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-moss-600 border-t-parchment-400 rounded-full animate-spin" />
        <p className="font-mono text-xs text-moss-500 mt-3">
          The gardener is thinking...
        </p>
      </div>
    );
  }

  const actionItems = advice.filter((a) => a.actionRequired && !a.dismissed);
  const infoItems = advice.filter((a) => !a.actionRequired && !a.dismissed);

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Weather card */}
      {weather && (
        <div className="bg-moss-800/40 border border-moss-700/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider">
              Bristol Now
            </p>
            <p className="font-display text-3xl text-parchment-200">
              {Math.round(weather.tempCurrent)}°C
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl">
              {weather.condition === "clear"
                ? "\u{2600}\u{FE0F}"
                : weather.condition === "rain"
                ? "\u{1F327}\u{FE0F}"
                : weather.condition === "partly-cloudy"
                ? "\u{26C5}"
                : "\u{2601}\u{FE0F}"}
            </p>
            <p className="font-mono text-[10px] text-moss-400 capitalize">
              {weather.condition.replace("-", " ")}
            </p>
            {weather.frostRisk && (
              <p className="font-mono text-[10px] text-red-400 mt-1">
                {"\u{2744}\u{FE0F}"} Frost risk
              </p>
            )}
          </div>
        </div>
      )}

      {/* Section: Things to do */}
      {actionItems.length > 0 && (
        <div>
          <h3 className="font-mono text-xs text-parchment-400 uppercase tracking-wider mb-3 px-1">
            {"\u{1F4CB}"} Things to do ({actionItems.length})
          </h3>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className={`border-l-4 rounded-lg p-4 ${getPriorityColor(
                  item.priority
                )} transition-all`}
              >
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                >
                  <span className="text-lg flex-shrink-0">
                    {getCategoryIcon(item.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[9px] text-moss-500 uppercase tracking-wider">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="font-mono text-[9px] text-parchment-500/50">
                        {getPriorityLabel(item.priority)}
                      </span>
                    </div>
                    <h4 className="font-body text-sm text-parchment-200 leading-tight">
                      {item.title}
                    </h4>
                  </div>
                  <span className="text-moss-500 text-xs flex-shrink-0">
                    {expanded === item.id ? "\u{25B2}" : "\u{25BC}"}
                  </span>
                </div>

                {expanded === item.id && (
                  <div className="mt-3 ml-9">
                    <p className="font-body text-xs text-parchment-500/70 leading-relaxed whitespace-pre-line">
                      {item.body}
                    </p>

                    {/* Quick care buttons for plant-specific advice */}
                    {item.plantId && item.category === "this-week" && (
                      <div className="flex gap-2 mt-3">
                        {item.title.toLowerCase().includes("water") && (
                          <button
                            onClick={() =>
                              logCareEvent(item.plantId, "watered")
                            }
                            disabled={careLogging === item.plantId + "watered"}
                            className="font-mono text-[10px] px-3 py-1.5 bg-blue-900/30 border border-blue-700/30 text-blue-300 rounded-full active:scale-95 disabled:opacity-50"
                          >
                            {careLogging === item.plantId + "watered"
                              ? "..."
                              : "\u{1F4A7} Done — Watered"}
                          </button>
                        )}
                        {item.title.toLowerCase().includes("feed") && (
                          <button
                            onClick={() => logCareEvent(item.plantId, "fed")}
                            disabled={careLogging === item.plantId + "fed"}
                            className="font-mono text-[10px] px-3 py-1.5 bg-green-900/30 border border-green-700/30 text-green-300 rounded-full active:scale-95 disabled:opacity-50"
                          >
                            {careLogging === item.plantId + "fed"
                              ? "..."
                              : "\u{1F33F} Done — Fed"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Info & fun */}
      {infoItems.length > 0 && (
        <div>
          <h3 className="font-mono text-xs text-moss-400 uppercase tracking-wider mb-3 px-1">
            {"\u{1F4A1}"} Updates & Tips
          </h3>
          <div className="space-y-2">
            {infoItems.map((item) => (
              <div
                key={item.id}
                className={`border-l-4 rounded-lg p-4 ${getPriorityColor(
                  item.priority
                )}`}
              >
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                >
                  <span className="text-lg flex-shrink-0">
                    {getCategoryIcon(item.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[9px] text-moss-500 uppercase tracking-wider">
                      {getCategoryLabel(item.category)}
                    </span>
                    <h4 className="font-body text-sm text-parchment-300 leading-tight">
                      {item.title}
                    </h4>
                  </div>
                  <span className="text-moss-500 text-xs flex-shrink-0">
                    {expanded === item.id ? "\u{25B2}" : "\u{25BC}"}
                  </span>
                </div>

                {expanded === item.id && (
                  <p className="mt-3 ml-9 font-body text-xs text-parchment-500/70 leading-relaxed whitespace-pre-line">
                    {item.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {advice.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">{"\u{1F33F}"}</span>
          <p className="font-body text-sm text-parchment-500/60">
            No advice yet. Add some plants and care events to get personalised
            guidance.
          </p>
        </div>
      )}
    </div>
  );
}
