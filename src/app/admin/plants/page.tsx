"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { thumbnail } from "@/lib/cloudinary";

interface Plant {
  id: string;
  commonName: string;
  latinName: string;
  variety: string;
  confidence: string;
  category: string;
  notes: string;
  owner: string;
  photoUrl: string | null;
  createdAt: string;
}

export default function AdminPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("");

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (confidenceFilter) params.set("confidence", confidenceFilter);

      try {
        const res = await fetch(`/api/admin/plants?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setPlants(data.plants || []);
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [categoryFilter, confidenceFilter]);

  const columns = [
    {
      key: "photo",
      label: "",
      className: "w-12",
      render: (row: Plant) => {
        const url = row.photoUrl ? thumbnail(row.photoUrl) : null;
        return url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={row.commonName}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
            🌿
          </div>
        );
      },
    },
    {
      key: "commonName",
      label: "Plant",
      render: (row: Plant) => (
        <div>
          <p className="font-medium text-gray-900">{row.commonName}</p>
          {row.latinName && (
            <p className="text-sm text-gray-500 italic">{row.latinName}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row: Plant) => {
        const icons: Record<string, string> = {
          flower: "🌺",
          vegetable: "🥦",
          fruit: "🍓",
          herb: "🌿",
        };
        return (
          <span className="text-base">
            {icons[row.category] || ""} {row.category}
          </span>
        );
      },
    },
    {
      key: "confidence",
      label: "Confidence",
      render: (row: Plant) => (
        <span
          className={`px-2 py-0.5 rounded text-sm font-medium ${
            row.confidence === "confirmed"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {row.confidence}
        </span>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      render: (row: Plant) => (
        <span className="text-gray-600">{row.owner}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Added",
      render: (row: Plant) => (
        <span className="text-gray-500 text-base">
          {new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading plants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Plants</h1>
        <p className="text-base text-gray-500 mt-1">
          {plants.length} plants across all users
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900"
        >
          <option value="">All categories</option>
          <option value="flower">Flower</option>
          <option value="vegetable">Vegetable</option>
          <option value="fruit">Fruit</option>
          <option value="herb">Herb</option>
        </select>
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900"
        >
          <option value="">All confidence</option>
          <option value="confirmed">Confirmed</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={plants}
        emptyMessage="No plants found"
      />
    </div>
  );
}
