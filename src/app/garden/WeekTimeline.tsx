"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AdviceEntry, WeatherSnapshot } from "@/lib/types";

interface WeekTimelineProps {
  advice: AdviceEntry[];
  daily: (WeatherSnapshot & { gardeningContext: string })[];
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

const CATEGORY_ICONS: Record<string, string> = {
  "this-week": "\u2705",
  "coming-up": "\u{1F4C5}",
  "weather-alert": "\u26A0\uFE0F",
  seasonal: "\u{1F331}",
  problem: "\u{1F41B}",
  harvest: "\u{1F33E}",
  "buy-list": "\u{1F6D2}",
  "growth-update": "\u{1F4CA}",
  "fun-fact": "\u{1F4A1}",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-parchment-400",
  medium: "bg-moss-400",
  low: "bg-moss-600",
  info: "bg-night-400",
};

export function WeekTimeline({ advice, daily }: WeekTimelineProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const actionItems = advice.filter((a) => a.actionRequired && !a.dismissed);
  const infoItems = advice.filter((a) => !a.actionRequired && !a.dismissed).slice(0, 5);

  // Group action items: today vs coming up
  const todayItems = actionItems.filter(
    (a) => a.category === "this-week" || a.category === "weather-alert" || a.category === "problem"
  );
  const upcomingItems = actionItems.filter(
    (a) => a.category === "coming-up" || a.category === "seasonal" || a.category === "harvest" || a.category === "buy-list"
  );

  return (
    <div ref={ref} className="mb-6">
      <h2 className="font-display text-lg text-parchment-200 mb-3">
        This Week
      </h2>

      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-moss-600/50 via-moss-700/30 to-transparent" />

        {/* Today section */}
        {todayItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 -ml-6">
              <div className="w-4 h-4 rounded-full bg-moss-700 border-2 border-moss-500 flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-moss-400" />
              </div>
              <span className="font-mono text-[11px] text-parchment-300 uppercase tracking-wider">
                Today
              </span>
              {daily[0] && (
                <span className="font-mono text-[10px] text-moss-500">
                  {WEATHER_ICONS[daily[0].condition]} {Math.round(daily[0].tempMax)}°/{Math.round(daily[0].tempMin)}°
                </span>
              )}
            </div>
            <div className="space-y-2">
              {todayItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="bg-moss-800/30 border border-moss-700/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />
                    <div className="min-w-0">
                      <p className="font-body text-xs text-parchment-300 leading-snug">
                        {CATEGORY_ICONS[item.category]} {item.title}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Coming up section */}
        {upcomingItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 -ml-6">
              <div className="w-4 h-4 rounded-full bg-moss-800 border-2 border-moss-700 z-10" />
              <span className="font-mono text-[11px] text-moss-400 uppercase tracking-wider">
                Coming Up
              </span>
            </div>
            <div className="space-y-2">
              {upcomingItems.slice(0, 8).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                  className="bg-moss-800/20 border border-moss-700/15 rounded-lg px-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />
                    <p className="font-body text-xs text-parchment-400/70 leading-snug">
                      {CATEGORY_ICONS[item.category]} {item.title}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Tips & info */}
        {infoItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 -ml-6">
              <div className="w-4 h-4 rounded-full bg-moss-800 border-2 border-moss-700/50 z-10" />
              <span className="font-mono text-[11px] text-moss-500 uppercase tracking-wider">
                Tips
              </span>
            </div>
            <div className="space-y-2">
              {infoItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                  className="bg-moss-800/10 border border-moss-700/10 rounded-lg px-3 py-2"
                >
                  <p className="font-body text-[11px] text-moss-400 leading-snug">
                    {CATEGORY_ICONS[item.category]} {item.title}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
