"use client";

import { useState, lazy, Suspense } from "react";

const PhotosTab = lazy(() =>
  import("./PhotosTab").then((m) => ({ default: m.PhotosTab }))
);
const PlantsTab = lazy(() =>
  import("./PlantsTab").then((m) => ({ default: m.PlantsTab }))
);
const GrowthTab = lazy(() =>
  import("./GrowthTab").then((m) => ({ default: m.GrowthTab }))
);
const AdviceTab = lazy(() =>
  import("./AdviceTab").then((m) => ({ default: m.AdviceTab }))
);

const TABS = ["Advice", "Photos", "Plants", "Growth"] as const;
type Tab = (typeof TABS)[number];

export default function GardenPortal() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Advice");

  const handleAuth = async () => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setError("");
      } else {
        setError("Wrong password");
      }
    } catch {
      setError("Connection failed — try again");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="max-w-sm mx-auto pt-20 px-6">
          <div className="text-center mb-8">
            <span className="text-4xl block mb-3">{"\u{1F33F}"}</span>
            <h2 className="font-display text-4xl text-parchment-200 mb-2">
              Garden Portal
            </h2>
            <p className="font-mono text-xs text-moss-500">
              Your AI gardening companion
            </p>
          </div>
          <div className="bg-night-900/40 border border-moss-800/30 rounded-lg p-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-4 py-3 text-parchment-300 font-body text-base focus:outline-none focus:border-moss-600 mb-4"
              placeholder="Password"
              autoFocus
            />
            {error && (
              <p className="font-mono text-xs text-red-400 mb-4">{error}</p>
            )}
            <button
              onClick={handleAuth}
              className="w-full bg-moss-700 hover:bg-moss-600 text-parchment-200 font-mono text-sm py-3 rounded-lg transition-colors active:scale-95"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-moss-800/50 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-parchment-200">
            Garden Portal
          </h1>
          <p className="font-mono text-[10px] text-moss-500 uppercase tracking-wider">
            AI Gardener
          </p>
        </div>
        <a
          href="/"
          className="font-mono text-xs text-moss-400 hover:text-parchment-300 transition-colors"
        >
          View Site {"\u{2192}"}
        </a>
      </div>

      {/* Tab content */}
      <div className="flex-1 max-w-lg mx-auto w-full pb-20">
        <Suspense
          fallback={
            <div className="py-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-moss-600 border-t-parchment-400 rounded-full animate-spin" />
              <p className="font-mono text-xs text-moss-500 mt-3">Loading...</p>
            </div>
          }
        >
          {activeTab === "Advice" && <AdviceTab password={password} />}
          {activeTab === "Photos" && <PhotosTab password={password} />}
          {activeTab === "Plants" && <PlantsTab password={password} />}
          {activeTab === "Growth" && <GrowthTab password={password} />}
        </Suspense>
      </div>

      {/* Fixed bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-night-950/95 border-t border-moss-800/50 backdrop-blur-sm z-40">
        <div className="max-w-lg mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center font-mono text-[10px] uppercase tracking-wider transition-colors active:scale-95 ${
                activeTab === tab
                  ? "text-parchment-200 border-t-2 border-moss-500"
                  : "text-moss-600 hover:text-moss-400"
              }`}
            >
              <span className="block text-lg mb-0.5">
                {tab === "Advice" && "\u{1F33F}"}
                {tab === "Photos" && "\u{1F4F7}"}
                {tab === "Plants" && "\u{1F331}"}
                {tab === "Growth" && "\u{1F4CF}"}
              </span>
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
