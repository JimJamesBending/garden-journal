"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface GrowthSparklineProps {
  data: { date: string; height: number }[];
}

export function GrowthSparkline({ data }: GrowthSparklineProps) {
  if (data.length < 2) {
    return (
      <div className="h-[30px] flex items-center">
        <div className="w-full h-px bg-garden-border" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={30}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="height"
          stroke="#2E7D32"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
