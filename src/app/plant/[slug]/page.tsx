import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPlantBySlug,
  getLogsForPlant,
  daysSince,
  getLatestStatus,
  getCategoryEmoji,
  getPlants,
} from "@/lib/data";
import { PlantLogs } from "@/components/PlantLogs";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default async function PlantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plant = await getPlantBySlug(slug);
  if (!plant) notFound();

  const logs = await getLogsForPlant(plant.id);
  const days = daysSince(plant.sowDate);
  const status = await getLatestStatus(plant.id);
  const emoji = getCategoryEmoji(plant.category);

  const sowDate = new Date(plant.sowDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 font-mono text-xs text-moss-600">
        <Link href="/" className="hover:text-parchment-400 transition-colors">
          Plants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-parchment-500">{plant.commonName}</span>
      </nav>

      {/* Plant header */}
      <section className="mb-10">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-3xl">{emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display text-4xl font-light text-parchment-200">
                {plant.commonName}
              </h2>
              <StatusPill status={status} />
            </div>
            <p className="font-body text-lg text-parchment-500 italic">
              {plant.variety}
            </p>
            {plant.latinName && (
              <p className="font-body text-sm text-moss-500 italic">
                {plant.latinName}
              </p>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-night-900/40 border border-moss-800/30 rounded-lg p-4">
          <div>
            <p className="font-mono text-[10px] text-moss-600 uppercase tracking-wider mb-1">
              Sowed
            </p>
            <p className="font-body text-sm text-parchment-400">{sowDate}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-moss-600 uppercase tracking-wider mb-1">
              Day
            </p>
            <p className="font-body text-sm text-parchment-400">{days}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-moss-600 uppercase tracking-wider mb-1">
              Location
            </p>
            <p className="font-body text-sm text-parchment-400 capitalize">
              {plant.location}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-moss-600 uppercase tracking-wider mb-1">
              Confidence
            </p>
            <p className="font-body text-sm text-parchment-400 capitalize">
              {plant.confidence}
            </p>
          </div>
        </div>

        {/* Notes */}
        {plant.notes && (
          <div className="mt-4 bg-night-900/20 border-l-2 border-moss-700/50 pl-4 py-2">
            <p className="font-body text-sm text-parchment-500">
              {plant.notes}
            </p>
          </div>
        )}
      </section>

      {/* Photo timeline */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-2xl text-parchment-300">
            Photo Log
          </h3>
          <Link
            href={`/garden`}
            className="font-mono text-xs text-moss-400 border border-moss-700/50 px-3 py-1.5 rounded hover:border-moss-500 hover:text-parchment-400 transition-colors"
          >
            + Add Photo
          </Link>
        </div>

        <PlantLogs plantId={plant.id} initialLogs={logs} />
      </section>
    </div>
  );
}
