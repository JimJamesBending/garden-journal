import { notFound, redirect } from "next/navigation";
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

  let plant;
  try {
    plant = await getPlantBySlug(slug);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "Not authenticated" || message === "No garden found") {
      redirect("/login");
    }
    throw e;
  }

  if (!plant) notFound();

  let logs;
  let status;
  try {
    logs = await getLogsForPlant(plant.id);
    status = await getLatestStatus(plant.id);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "Not authenticated" || message === "No garden found") {
      redirect("/login");
    }
    throw e;
  }

  const days = daysSince(plant.sowDate);
  const emoji = getCategoryEmoji(plant.category);

  const sowDate = new Date(plant.sowDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 font-sans text-base text-garden-textMuted">
        <Link href="/" className="hover:text-garden-green transition-colors">
          Plants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-garden-text">{plant.commonName}</span>
      </nav>

      {/* Plant header */}
      <section className="mb-10">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-3xl">{emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-sans font-bold text-4xl font-light text-garden-text">
                {plant.commonName}
              </h2>
              <StatusPill status={status} />
            </div>
            <p className="font-sans text-lg text-garden-textMuted italic">
              {plant.variety}
            </p>
            {plant.latinName && (
              <p className="font-sans text-sm text-garden-textMuted italic">
                {plant.latinName}
              </p>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-garden-greenLight border border-garden-border rounded-lg p-4">
          <div>
            <p className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
              Sowed
            </p>
            <p className="font-sans text-sm text-garden-text">{sowDate}</p>
          </div>
          <div>
            <p className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
              Day
            </p>
            <p className="font-sans text-sm text-garden-text">{days}</p>
          </div>
          <div>
            <p className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
              Location
            </p>
            <p className="font-sans text-sm text-garden-text capitalize">
              {plant.location}
            </p>
          </div>
          <div>
            <p className="font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
              Confidence
            </p>
            <p className="font-sans text-sm text-garden-text capitalize">
              {plant.confidence}
            </p>
          </div>
        </div>

        {/* Notes */}
        {plant.notes && (
          <div className="mt-4 bg-garden-greenLight border-l-2 border-garden-greenBright pl-4 py-2">
            <p className="font-sans text-sm text-garden-textMuted">
              {plant.notes}
            </p>
          </div>
        )}
      </section>

      {/* Photo timeline */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-sans font-bold text-2xl text-garden-text">
            Photo Log
          </h3>
          <Link
            href={`/garden`}
            className="font-sans text-base text-garden-green border border-garden-border px-3 py-1.5 rounded hover:border-garden-greenBright hover:text-garden-greenBright transition-colors"
          >
            + Add Photo
          </Link>
        </div>

        <PlantLogs plantId={plant.id} initialLogs={logs} />
      </section>
    </div>
  );
}
