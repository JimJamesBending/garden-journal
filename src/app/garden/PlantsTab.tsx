"use client";

import { useState, useEffect, useCallback } from "react";

interface Plant {
  id: string;
  slug: string;
  commonName: string;
  variety: string;
  latinName: string;
  confidence: string;
  sowDate: string;
  location: string;
  category: string;
  notes: string;
}

interface LogEntry {
  plantId: string;
}

export function PlantsTab({ password }: { password: string }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Form state
  const [form, setForm] = useState({
    commonName: "",
    variety: "",
    latinName: "",
    category: "flower",
    sowDate: new Date().toISOString().split("T")[0],
    location: "indoor",
    notes: "",
  });

  const loadData = useCallback(async () => {
    const [plantsRes, logsRes] = await Promise.all([
      fetch("/api/plants"),
      fetch("/api/logs"),
    ]);
    setPlants(await plantsRes.json());
    setLogs(await logsRes.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const photoCount = (plantId: string) =>
    logs.filter((l) => l.plantId === plantId).length;

  const resetForm = () => {
    setForm({
      commonName: "",
      variety: "",
      latinName: "",
      category: "flower",
      sowDate: new Date().toISOString().split("T")[0],
      location: "indoor",
      notes: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (plant: Plant) => {
    setForm({
      commonName: plant.commonName,
      variety: plant.variety,
      latinName: plant.latinName,
      category: plant.category,
      sowDate: plant.sowDate,
      location: plant.location,
      notes: plant.notes,
    });
    setEditingId(plant.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.commonName.trim()) {
      setMessage("Name is required");
      return;
    }

    const url = editingId ? `/api/plants/${editingId}` : "/api/plants";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, password }),
    });

    if (res.ok) {
      setMessage(editingId ? "Plant updated" : "Plant added");
      resetForm();
      loadData();
    } else {
      setMessage("Failed to save");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    const res = await fetch(`/api/plants/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setMessage("Plant deleted");
      loadData();
    } else {
      setMessage("Failed to delete");
    }
  };

  const categoryEmoji: Record<string, string> = {
    fruit: "\u{1F353}",
    vegetable: "\u{1F955}",
    herb: "\u{1F33F}",
    flower: "\u{1F33A}",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs text-moss-400 uppercase tracking-wider">
          {plants.length} plants
        </h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-moss-700 hover:bg-moss-600 text-parchment-200 font-mono text-xs px-4 py-2 rounded-lg transition-colors active:scale-95"
        >
          {showForm ? "Cancel" : "+ Add Plant"}
        </button>
      </div>

      {message && (
        <p className="font-mono text-xs text-moss-400 text-center mb-4">
          {message}
        </p>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-night-900/50 border border-moss-800/30 rounded-lg p-4 mb-6 space-y-3">
          <input
            type="text"
            value={form.commonName}
            onChange={(e) =>
              setForm({ ...form, commonName: e.target.value })
            }
            placeholder="Plant name *"
            className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
          />
          <input
            type="text"
            value={form.variety}
            onChange={(e) => setForm({ ...form, variety: e.target.value })}
            placeholder="Variety"
            className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
          />
          <input
            type="text"
            value={form.latinName}
            onChange={(e) =>
              setForm({ ...form, latinName: e.target.value })
            }
            placeholder="Latin name"
            className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
            >
              <option value="flower">Flower</option>
              <option value="vegetable">Vegetable</option>
              <option value="fruit">Fruit</option>
              <option value="herb">Herb</option>
            </select>
            <select
              value={form.location}
              onChange={(e) =>
                setForm({ ...form, location: e.target.value })
              }
              className="bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>
          <input
            type="date"
            value={form.sowDate}
            onChange={(e) => setForm({ ...form, sowDate: e.target.value })}
            className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes"
            rows={2}
            className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2.5 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600 resize-none"
          />
          <button
            onClick={handleSave}
            className="w-full bg-moss-600 hover:bg-moss-500 text-parchment-200 font-mono text-sm py-3 rounded-lg transition-colors active:scale-[0.98]"
          >
            {editingId ? "Update Plant" : "Add Plant"}
          </button>
        </div>
      )}

      {/* Plant list */}
      <div className="space-y-2">
        {plants.map((plant) => (
          <div
            key={plant.id}
            className="bg-night-900/40 border border-moss-800/30 rounded-lg p-3 flex items-center gap-3"
          >
            <span className="text-xl">
              {categoryEmoji[plant.category] || "\u{1F331}"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-parchment-300 truncate">
                {plant.commonName}
              </p>
              <p className="font-body text-xs text-parchment-600 italic truncate">
                {plant.variety}
              </p>
            </div>
            <span className="font-mono text-[10px] text-moss-500 flex-shrink-0">
              {photoCount(plant.id)} pics
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => startEdit(plant)}
                className="text-moss-500 hover:text-parchment-400 font-mono text-xs px-2 py-1 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  handleDelete(plant.id, plant.commonName)
                }
                className="text-red-700 hover:text-red-500 font-mono text-xs px-2 py-1 rounded transition-colors"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
