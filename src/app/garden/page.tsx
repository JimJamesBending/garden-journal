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

const TABS = ["Photos", "Plants", "Growth"] as const;
type Tab = (typeof TABS)[number];

export default function GardenPortal() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Photos");

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
      <div className="max-w-sm mx-auto pt-20">
        <div className="text-center mb-8">
          <h2 className="font-display text-4xl text-parchment-200 mb-2">
            Garden Portal
          </h2>
          <p className="font-mono text-xs text-moss-500">
            Manage your garden
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
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Tab content */}
      <div className="mb-4">
        <Suspense
          fallback={
            <p className="font-mono text-xs text-moss-500 text-center py-12">
              Loading...
            </p>
          }
        >
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
              className={`flex-1 py-4 text-center font-mono text-xs uppercase tracking-wider transition-colors active:scale-95 ${
                activeTab === tab
                  ? "text-parchment-200 border-t-2 border-moss-500"
                  : "text-moss-600 hover:text-moss-400"
              }`}
            >
              {tab === "Photos" && (
                <span className="block text-lg mb-0.5">
                  {activeTab === tab ? "\u{1F4F7}" : "\u{1F4F7}"}
                </span>
              )}
              {tab === "Plants" && (
                <span className="block text-lg mb-0.5">{"\u{1F331}"}</span>
              )}
              {tab === "Growth" && (
                <span className="block text-lg mb-0.5">{"\u{1F4CF}"}</span>
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
