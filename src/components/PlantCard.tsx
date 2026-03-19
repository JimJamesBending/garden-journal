import Link from "next/link";
import { Plant, LogEntry } from "@/lib/types";
import { daysSince, getCategoryEmoji } from "@/lib/data";
import { StatusPill } from "./StatusPill";

interface PlantCardProps {
  plant: Plant;
  latestLog?: LogEntry;
}

export function PlantCard({ plant, latestLog }: PlantCardProps) {
  const days = daysSince(plant.sowDate);
  const status = latestLog?.status ?? "sowed";
  const emoji = getCategoryEmoji(plant.category);

  return (
    <Link
      href={`/plant/${plant.slug}`}
      className="group block bg-night-900/60 border border-moss-800/40 rounded-lg overflow-hidden hover:border-moss-600/60 transition-all duration-300 hover:shadow-lg hover:shadow-moss-950/50"
    >
      {/* Thumbnail area */}
      <div className="aspect-[4/3] bg-night-950/80 relative overflow-hidden">
        {latestLog?.cloudinaryUrl ? (
          <img
            src={latestLog.cloudinaryUrl}
            alt={`${plant.commonName} — ${latestLog.caption}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl opacity-30">{emoji}</span>
              <p className="font-mono text-xs text-moss-700 mt-2">
                Awaiting first photo
              </p>
            </div>
          </div>
        )}

        {/* Confidence badge */}
        {plant.confidence === "partial" && (
          <div className="absolute top-2 right-2 bg-earth-800/80 text-earth-300 font-mono text-[10px] px-1.5 py-0.5 rounded">
            ID uncertain
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display text-xl text-parchment-200 group-hover:text-parchment-100 transition-colors leading-tight">
            {plant.commonName}
          </h3>
          <StatusPill status={status} />
        </div>

        <p className="font-body text-sm text-parchment-500 italic mb-2">
          {plant.variety}
        </p>

        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-moss-500">
            Day {days}
          </span>
          <span className="font-mono text-xs text-moss-600 uppercase tracking-wider">
            {plant.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
