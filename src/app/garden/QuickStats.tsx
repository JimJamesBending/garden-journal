"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Plant, LogEntry, CareEvent, GrowthEntry } from "@/lib/types";

interface QuickStatsProps {
  plants: Plant[];
  logs: LogEntry[];
  care: CareEvent[];
  growth: GrowthEntry[];
}

export function QuickStats({ plants, logs, care, growth }: QuickStatsProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  // Care events this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split("T")[0];
  const careThisWeek = care.filter((e) => e.date >= weekStr).length;

  // Average health score from latest entries per plant
  const latestHealth: number[] = [];
  for (const plant of plants) {
    const entries = growth
      .filter((g) => g.plantId === plant.id && g.healthScore !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (entries.length > 0 && entries[0].healthScore !== null) {
      latestHealth.push(entries[0].healthScore);
    }
  }
  const avgHealth = latestHealth.length > 0
    ? (latestHealth.reduce((a, b) => a + b, 0) / latestHealth.length).toFixed(1)
    : "--";

  const stats = [
    { value: plants.length.toString(), label: "Plants", icon: "\u{1F33F}" },
    { value: logs.filter((l) => l.labeled).length.toString(), label: "Photos", icon: "\u{1F4F7}" },
    { value: careThisWeek.toString(), label: "This Wk", icon: "\u{1F4A7}" },
    { value: avgHealth, label: "Health", icon: "\u{1F49A}" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-4 gap-2 mb-6"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-moss-800/30 border border-moss-700/20 rounded-xl py-3 text-center"
        >
          <div className="text-sm mb-0.5">{stat.icon}</div>
          <div className="font-display text-xl text-parchment-200">{stat.value}</div>
          <div className="font-mono text-[8px] text-moss-500 uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
