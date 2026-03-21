"use client";

import { useEffect, useState } from "react";

interface DailyData {
  date: string;
  messages: number;
  plants: number;
  users: number;
}

interface AnalyticsData {
  dailyData: DailyData[];
  topSpecies: Array<{ name: string; count: number }>;
  categoryCounts: Record<string, number>;
  funnel: {
    totalUsers: number;
    withConversation: number;
    with2Plants: number;
    with5Plants: number;
    journalRevealed: number;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  // Simple bar chart using CSS (no Recharts dependency needed)
  const maxMessages = Math.max(...data.dailyData.map((d) => d.messages), 1);
  const maxPlants = Math.max(...data.dailyData.map((d) => d.plants), 1);

  // Last 14 days for display
  const recentData = data.dailyData.slice(-14);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-base text-gray-500 mt-1">Last 30 days of data</p>
      </div>

      {/* Conversion funnel */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          User Journey Funnel
        </h2>
        <div className="space-y-3">
          <FunnelBar
            label="Total Users"
            value={data.funnel.totalUsers}
            max={data.funnel.totalUsers}
          />
          <FunnelBar
            label="Started Conversation"
            value={data.funnel.withConversation}
            max={data.funnel.totalUsers}
          />
          <FunnelBar
            label="2+ Plants Identified"
            value={data.funnel.with2Plants}
            max={data.funnel.totalUsers}
          />
          <FunnelBar
            label="5+ Plants Identified"
            value={data.funnel.with5Plants}
            max={data.funnel.totalUsers}
          />
          <FunnelBar
            label="Journal Revealed"
            value={data.funnel.journalRevealed}
            max={data.funnel.totalUsers}
          />
        </div>
      </div>

      {/* Messages per day */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Messages per Day
        </h2>
        <div className="flex items-end gap-1 h-32">
          {recentData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{
                  height: `${(d.messages / maxMessages) * 100}%`,
                  minHeight: d.messages > 0 ? "4px" : "0",
                }}
                title={`${d.date}: ${d.messages} messages`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {recentData.map((d) => (
            <div
              key={d.date}
              className="flex-1 text-center text-xs text-gray-400"
            >
              {new Date(d.date).getDate()}
            </div>
          ))}
        </div>
      </div>

      {/* Plants per day */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Plants Identified per Day
        </h2>
        <div className="flex items-end gap-1 h-32">
          {recentData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-green-500 rounded-t"
                style={{
                  height: `${(d.plants / maxPlants) * 100}%`,
                  minHeight: d.plants > 0 ? "4px" : "0",
                }}
                title={`${d.date}: ${d.plants} plants`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {recentData.map((d) => (
            <div
              key={d.date}
              className="flex-1 text-center text-xs text-gray-400"
            >
              {new Date(d.date).getDate()}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top species */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Most Identified Species
          </h2>
          {data.topSpecies.length === 0 ? (
            <p className="text-gray-500 text-base">No data yet</p>
          ) : (
            <div className="space-y-2">
              {data.topSpecies.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                >
                  <span className="text-base text-gray-700">{s.name}</span>
                  <span className="text-base font-medium text-gray-900">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Category Breakdown
          </h2>
          {Object.keys(data.categoryCounts).length === 0 ? (
            <p className="text-gray-500 text-base">No data yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const icons: Record<string, string> = {
                    flower: "🌺",
                    vegetable: "🥦",
                    fruit: "🍓",
                    herb: "🌿",
                  };
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between"
                    >
                      <span className="text-base text-gray-700">
                        {icons[cat] || ""} {cat}
                      </span>
                      <span className="text-base font-medium text-gray-900">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-base text-gray-500">{label}</span>
        <span className="text-base font-medium text-gray-900">
          {value} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-6 bg-gray-200 rounded-lg overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-lg transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
