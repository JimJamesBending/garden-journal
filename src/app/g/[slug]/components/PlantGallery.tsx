"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { showcaseImage } from "@/lib/cloudinary";

// --- Types ---

interface PlantData {
  id: string;
  commonName: string;
  latinName: string | null;
  category: string | null;
  variety: string | null;
  notes: string | null;
  sowDate: string | null;
  location: string | null;
  confidence: string | null;
  createdAt: string | null;
  photoUrl: string | null;
  photoCount: number;
  impactGrade: string | null;
  status: string | null;
}

interface PlantGalleryProps {
  plants: PlantData[];
  onPlantClick: (plantId: string) => void;
}

// --- Helpers ---

const CATEGORIES = ["All", "Flowers", "Vegetables", "Herbs", "Fruit"] as const;

const CATEGORY_MAP: Record<string, string> = {
  Flowers: "flower",
  Vegetables: "vegetable",
  Herbs: "herb",
  Fruit: "fruit",
};

function getCategoryEmoji(category: string | null): string {
  const emojis: Record<string, string> = {
    flower: "\u{1F33A}",
    vegetable: "\u{1F966}",
    herb: "\u{1F33F}",
    fruit: "\u{1F353}",
  };
  return emojis[category || ""] || "\u{1F331}";
}

function getCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    flower: "bg-pink-100 text-pink-800",
    vegetable: "bg-green-100 text-green-800",
    herb: "bg-emerald-100 text-emerald-800",
    fruit: "bg-orange-100 text-orange-800",
  };
  return colors[category || ""] || "bg-garden-greenLight text-garden-text";
}

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-garden-green text-white";
  if (grade.startsWith("B")) return "bg-garden-greenBright text-white";
  if (grade.startsWith("C")) return "bg-garden-amber text-white";
  return "bg-garden-textMuted text-white";
}

function daysSince(date: string): string {
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Planted today";
  if (days === 1) return "Planted yesterday";
  return `Planted ${days} days ago`;
}

// --- Component ---

export function PlantGallery({ plants, onPlantClick }: PlantGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const filtered =
    activeFilter === "All"
      ? plants
      : plants.filter(
          (p) => p.category === CATEGORY_MAP[activeFilter]
        );

  return (
    <section ref={ref} className="py-12 sm:py-16">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 className="font-sans text-heading text-garden-text">
            The Collection
          </h2>
          <p className="font-sans text-body-sm text-garden-textMuted mt-1">
            {plants.length} {plants.length === 1 ? "plant" : "plants"}
          </p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`font-sans text-body-sm px-4 py-2 rounded-full border transition-all duration-200 min-h-[44px] ${
              activeFilter === cat
                ? "bg-garden-green text-white border-garden-green"
                : "bg-white text-garden-textMuted border-garden-border hover:border-garden-greenBright hover:text-garden-text"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Plant cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((plant, i) => (
          <motion.div
            key={plant.id}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{
              delay: 0.06 * Math.min(i, 12),
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              transition: { duration: 0.2 },
            }}
            onClick={() => onPlantClick(plant.id)}
            className="group relative rounded-2xl overflow-hidden border border-garden-border bg-white cursor-pointer transition-shadow"
          >
            {/* Photo area */}
            <div className="relative aspect-[4/5] overflow-hidden bg-garden-offwhite">
              {plant.photoUrl ? (
                <img
                  src={showcaseImage(plant.photoUrl)}
                  alt={plant.commonName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <span className="text-6xl opacity-30">
                    {getCategoryEmoji(plant.category)}
                  </span>
                  <span className="font-sans text-label text-garden-textMuted uppercase tracking-wider">
                    No photo yet
                  </span>
                </div>
              )}

              {/* Photo count badge - top right */}
              {plant.photoCount > 0 && (
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white rounded-full px-2.5 py-1 flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="font-sans text-label font-medium">
                    {plant.photoCount}
                  </span>
                </div>
              )}

              {/* Impact grade badge - top left */}
              {plant.impactGrade && (
                <div
                  className={`absolute top-3 left-3 rounded-full px-2.5 py-1 font-sans text-label font-bold ${getGradeColor(plant.impactGrade)}`}
                >
                  {plant.impactGrade}
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-4">
              <h3 className="font-sans font-bold text-body text-garden-text">
                {plant.commonName}
              </h3>
              {plant.latinName && (
                <p className="font-sans text-body-sm text-garden-textMuted italic mt-0.5">
                  {plant.latinName}
                </p>
              )}

              <div className="flex items-center justify-between mt-3">
                {/* Category pill */}
                {plant.category && (
                  <span
                    className={`font-sans text-label px-2.5 py-0.5 rounded-full ${getCategoryColor(plant.category)}`}
                  >
                    {getCategoryEmoji(plant.category)}{" "}
                    {plant.category.charAt(0).toUpperCase() +
                      plant.category.slice(1)}
                  </span>
                )}

                {/* Planted date */}
                {plant.sowDate && (
                  <span className="font-sans text-label text-garden-textMuted">
                    {daysSince(plant.sowDate)}
                  </span>
                )}
                {!plant.sowDate && plant.createdAt && (
                  <span className="font-sans text-label text-garden-textMuted">
                    {daysSince(plant.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="font-sans text-body text-garden-textMuted">
            No plants in this category yet.
          </p>
        </div>
      )}
    </section>
  );
}
