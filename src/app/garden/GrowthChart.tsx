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
      <div className="bg-garden-greenLight border border-garden-border rounded-xl p-6 text-center">
        <p className="font-sans text-base text-garden-textMuted">
          No growth data yet. Start logging measurements!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-garden-greenLight border border-garden-border rounded-xl p-4">
      <h3 className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-3">
        Growth Over Time
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8E6C9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 14, fill: "#1A1A1A" }}
            tickLine={false}
            axisLine={{ stroke: "#C8E6C9" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 14, fill: "#1A1A1A" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "cm",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 14, fill: "#1A1A1A" },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 14, fill: "#4A4A4A" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "leaves",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 14, fill: "#4A4A4A" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #C8E6C9",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#1A1A1A",
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="height"
            stroke="#2E7D32"
            strokeWidth={2}
            dot={{ r: 3, fill: "#2E7D32" }}
            name="Height (cm)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="leaves"
            stroke="#FF8F00"
            strokeWidth={2}
            dot={{ r: 3, fill: "#FF8F00" }}
            name="Leaf Count"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
