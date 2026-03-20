"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { GrowthEntry } from "@/lib/types";

interface GrowthChartProps {
  data: GrowthEntry[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  const chartData = data
    .filter((g) => g.heightCm !== null || g.leafCount !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((g) => ({
      date: new Date(g.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      height: g.heightCm,
      leaves: g.leafCount,
      health: g.healthScore,
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-moss-800/20 border border-moss-700/20 rounded-xl p-6 text-center">
        <p className="font-mono text-xs text-moss-500">
          No growth data yet. Start logging measurements!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-moss-800/20 border border-moss-700/20 rounded-xl p-4">
      <h3 className="font-mono text-[10px] text-moss-400 uppercase tracking-wider mb-3">
        Growth Over Time
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#163a1620" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#4a8a4a" }}
            tickLine={false}
            axisLine={{ stroke: "#163a1640" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 9, fill: "#4a8a4a" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "cm",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 9, fill: "#4a8a4a" },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 9, fill: "#c4a05a" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "leaves",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 9, fill: "#c4a05a" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f2a0f",
              border: "1px solid #163a16",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#e8d5b0",
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="height"
            stroke="#4a8a4a"
            strokeWidth={2}
            dot={{ r: 3, fill: "#4a8a4a" }}
            name="Height (cm)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="leaves"
            stroke="#c4a05a"
            strokeWidth={2}
            dot={{ r: 3, fill: "#c4a05a" }}
            name="Leaf Count"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
