"use client";

import { useEffect, useState } from "react";

interface DebugEvent {
  event: string;
  data: Record<string, unknown>;
  created_at: string;
}

export default function AdminDiagnosticsPage() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
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
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = filter
    ? events.filter(
        (e) =>
          e.event.toLowerCase().includes(filter.toLowerCase()) ||
          JSON.stringify(e.data).toLowerCase().includes(filter.toLowerCase())
      )
    : events;

  // Separate typing events for the typing diagnostics panel
  const typingEvents = events.filter(
    (e) =>
      e.event.includes("typing") ||
      e.event.includes("show_typing") ||
      e.event.includes("keepalive")
  );

  const errorEvents = events.filter(
    (e) =>
      e.event.toLowerCase().includes("error") ||
      (e.data && JSON.stringify(e.data).toLowerCase().includes("error"))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Diagnostics</h1>
        <p className="text-base text-gray-500 mt-1">
          Live debug logs, refreshes every 3s
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-base text-gray-500">Total Events</p>
          <p className="text-xl font-bold text-gray-900">{events.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-base text-gray-500">Typing Calls</p>
          <p className="text-xl font-bold text-gray-900">{typingEvents.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-base text-gray-500">Errors</p>
          <p className={`text-xl font-bold ${errorEvents.length > 0 ? "text-red-600" : "text-gray-900"}`}>
            {errorEvents.length}
          </p>
        </div>
      </div>

      {/* Typing indicator diagnostics */}
      {typingEvents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900">
              Typing Indicator Calls
            </h2>
            <span className="text-sm text-gray-500">
              {typingEvents.length} events
            </span>
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {typingEvents.map((event, i) => {
              const data = event.data || {};
              const statusCode = data.status || data.statusCode;
              const mode = data.mode || "unknown";
              const isSuccess =
                statusCode === 200 || statusCode === "200" || data.ok === true;

              return (
                <div key={i} className="px-4 py-2 text-base">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSuccess ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-gray-700">{event.event}</span>
                    <span className="text-sm text-gray-400">
                      mode: {String(mode)}
                    </span>
                    <span className="text-sm text-gray-400 ml-auto">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div>
        <input
          type="text"
          placeholder="Filter events..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-base text-gray-900 w-full max-w-sm placeholder-gray-400"
        />
      </div>

      {/* Full event log */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-900">All Events</h2>
        </div>
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500">
              No events found
            </p>
          ) : (
            filteredEvents.map((event, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-medium text-gray-700">
                    {event.event}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-sm text-gray-500 font-mono overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
