"use client";

import { useEffect, useState } from "react";

interface ActivityEvent {
  event: string;
  data: Record<string, unknown>;
  created_at: string;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/admin/stats?type=activity");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500 text-base">Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Live Activity</h3>
        <p className="text-sm text-gray-500">Auto-refreshes every 5s</p>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="px-4 py-6 text-center text-gray-500 text-base">
            No recent activity
          </p>
        ) : (
          events.map((event, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-base font-medium text-gray-700">
                  {event.event}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
              {event.data && Object.keys(event.data).length > 0 && (
                <p className="text-sm text-gray-500 font-mono truncate">
                  {JSON.stringify(event.data).slice(0, 120)}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
