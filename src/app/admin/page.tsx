"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { HealthIndicator } from "@/components/admin/HealthIndicator";
import { ActivityFeed } from "@/components/admin/ActivityFeed";

interface Stats {
  users: number;
  plants: number;
  conversations: number;
  messagesToday: number;
  spaces: number;
  recentErrors: number;
}

interface HealthChecks {
  status: "healthy" | "degraded" | "down";
  checks: Record<
    string,
    { status: "healthy" | "degraded" | "down"; detail: string }
  >;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthChecks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/health"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (healthRes.ok) setHealth(await healthRes.json());
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live stats, auto-refreshes every 10s
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Users" value={stats?.users ?? "-"} />
        <StatCard label="Plants" value={stats?.plants ?? "-"} />
        <StatCard label="Conversations" value={stats?.conversations ?? "-"} />
        <StatCard
          label="Messages Today"
          value={stats?.messagesToday ?? "-"}
        />
        <StatCard label="Spaces" value={stats?.spaces ?? "-"} />
        <StatCard
          label="Recent Errors"
          value={stats?.recentErrors ?? "-"}
          trend={
            stats?.recentErrors && stats.recentErrors > 0 ? "down" : "neutral"
          }
          detail={
            stats?.recentErrors && stats.recentErrors > 0
              ? `${stats.recentErrors} in last 24h`
              : "All clear"
          }
        />
      </div>

      {/* Health + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            System Health
          </h2>
          <div className="space-y-2">
            {health?.checks ? (
              Object.entries(health.checks).map(([key, check]) => (
                <HealthIndicator
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  status={check.status}
                  detail={check.detail}
                />
              ))
            ) : (
              <p className="text-gray-500 text-sm">No health data</p>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Activity Feed
          </h2>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
