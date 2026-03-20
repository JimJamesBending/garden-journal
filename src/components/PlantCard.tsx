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
      className="group block bg-white border border-garden-border rounded-lg overflow-hidden hover:border-garden-greenBright transition-all duration-300 hover:shadow-lg"
    >
      {/* Thumbnail area */}
      <div className="aspect-[4/3] bg-garden-greenLight relative overflow-hidden">
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
              <p className="font-sans text-base text-garden-textMuted mt-2">
                Awaiting first photo
              </p>
            </div>
          </div>
        )}

        {/* Confidence badge */}
        {plant.confidence === "partial" && (
          <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 font-sans text-base px-1.5 py-0.5 rounded">
            ID uncertain
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-sans font-bold text-xl text-garden-text group-hover:text-garden-green transition-colors leading-tight">
            {plant.commonName}
          </h3>
          <StatusPill status={status} />
        </div>

        <p className="font-sans text-sm text-garden-textMuted italic mb-2">
          {plant.variety}
        </p>

        <div className="flex items-center justify-between">
          <span className="font-sans text-base text-garden-textMuted">
            Day {days}
          </span>
          <span className="font-sans text-base text-garden-textMuted uppercase tracking-wider">
            {plant.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
