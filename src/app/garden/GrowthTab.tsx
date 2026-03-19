"use client";

import { useState, useEffect, useCallback } from "react";

interface Plant {
  id: string;
  commonName: string;
  variety: string;
}

interface GrowthEntry {
  id: string;
  plantId: string;
  date: string;
  heightCm: number | null;
  leafCount: number | null;
  healthScore: number | null;
  notes: string;
}

export function GrowthTab({ password }: { password: string }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form
  const [heightCm, setHeightCm] = useState("");
  const [leafCount, setLeafCount] = useState("");
  const [healthScore, setHealthScore] = useState(3);
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    const [plantsRes, growthRes] = await Promise.all([
      fetch("/api/plants"),
      fetch("/api/growth"),
    ]);
    setPlants(await plantsRes.json());
    setEntries(await growthRes.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEntries = selectedPlant
    ? entries.filter((e) => e.plantId === selectedPlant)
    : entries;

  const handleSave = async () => {
    if (!selectedPlant) {
      setMessage("Pick a plant first");
      return;
    }

    setSaving(true);
    setMessage("");

    const res = await fetch("/api/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plantId: selectedPlant,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        leafCount: leafCount ? parseInt(leafCount) : null,
        healthScore,
        notes,
        password,
      }),
    });

    if (res.ok) {
      setMessage("Growth logged");
      setHeightCm("");
      setLeafCount("");
      setHealthScore(3);
      setNotes("");
      loadData();
    } else {
      setMessage("Failed to save");
    }

    setSaving(false);
  };

  const plantName = (id: string) => {
    const p = plants.find((pl) => pl.id === id);
    return p ? p.commonName : "Unknown";
  };

  const healthEmoji = (score: number | null) => {
    if (score === null) return "";
    const emojis = [
      "",
      "\u{1F635}",
      "\u{1F615}",
      "\u{1F642}",
      "\u{1F60A}",
      "\u{1F929}",
    ];
    return emojis[score] || "";
  };

  return (
    <div>
      {/* Plant selector */}
      <select
        value={selectedPlant}
        onChange={(e) => setSelectedPlant(e.target.value)}
        className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-3 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600 mb-4"
      >
        <option value="">Select a plant...</option>
        {plants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.commonName} — {p.variety}
          </option>
        ))}
      </select>

      {/* Log form */}
      {selectedPlant && (
        <div className="bg-night-900/50 border border-moss-800/30 rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="0"
                className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-1">
                Leaf count
              </label>
              <input
                type="number"
                value={leafCount}
                onChange={(e) => setLeafCount(e.target.value)}
                placeholder="0"
                className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
              />
            </div>
          </div>

          {/* Health score */}
          <div>
            <label className="block font-mono text-[10px] text-moss-500 uppercase tracking-wider mb-2">
              Health: {healthEmoji(healthScore)} {healthScore}/5
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => setHealthScore(score)}
                  className={`flex-1 py-2 rounded-lg font-mono text-sm transition-all active:scale-90 ${
                    healthScore >= score
                      ? "bg-moss-600 text-parchment-200"
                      : "bg-night-950/80 text-moss-600 border border-moss-800/50"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-moss-600 hover:bg-moss-500 disabled:bg-moss-800 text-parchment-200 font-mono text-sm py-3 rounded-lg transition-colors active:scale-[0.98]"
          >
            {saving ? "Saving..." : "Log Growth"}
          </button>

          {message && (
            <p className="font-mono text-xs text-moss-400 text-center">
              {message}
            </p>
          )}
        </div>
      )}

      {/* Growth timeline */}
      <div>
        <h3 className="font-mono text-xs text-moss-400 uppercase tracking-wider mb-3">
          Growth Log ({filteredEntries.length} entries)
        </h3>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-moss-800/50 rounded-lg">
            <p className="font-mono text-sm text-moss-600">
              {selectedPlant
                ? "No growth data yet for this plant"
                : "Select a plant to see growth data"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...filteredEntries].reverse().map((entry) => (
              <div
                key={entry.id}
                className="bg-night-900/40 border border-moss-800/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-moss-500">
                    {new Date(entry.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="font-body text-xs text-parchment-500">
                    {plantName(entry.plantId)}
                  </span>
                </div>
                <div className="flex gap-4 font-mono text-xs text-parchment-400">
                  {entry.heightCm !== null && (
                    <span>{entry.heightCm}cm</span>
                  )}
                  {entry.leafCount !== null && (
                    <span>{entry.leafCount} leaves</span>
                  )}
                  {entry.healthScore !== null && (
                    <span>{healthEmoji(entry.healthScore)}</span>
                  )}
                </div>
                {entry.notes && (
                  <p className="font-body text-xs text-parchment-600 mt-1">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
