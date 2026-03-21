import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { thumbnail, heroImage } from "@/lib/cloudinary";
import { SPACE_HIERARCHY, SUBTYPE_INFO, type SpaceType, type SpaceSubtype } from "@/lib/types";

interface GardenPageProps {
  params: Promise<{ slug: string }>;
}

// --- Space display helpers ---

function spaceIcon(type: string): string {
  return SPACE_HIERARCHY[type as SpaceType]?.icon || "\u{1F331}";
}

function spaceLabel(type: string): string {
  return SPACE_HIERARCHY[type as SpaceType]?.label || type;
}

// --- Category display ---

const CATEGORY_ICONS: Record<string, string> = {
  flower: "\u{1F33A}",
  vegetable: "\u{1F966}",
  fruit: "\u{1F353}",
  herb: "\u{1F33F}",
};

// --- Types for raw DB rows ---

interface DbPlant {
  id: string;
  common_name: string;
  latin_name: string | null;
  category: string | null;
  notes: string | null;
  created_at: string | null;
}

interface DbSpace {
  id: string;
  name: string;
  type: SpaceType;
  description: string | null;
  background_image_url: string | null;
  plant_positions: Array<{ plantId: string; x: number; y: number; subtype?: SpaceSubtype }>;
}

interface PlantLog {
  cloudinary_url: string;
  caption: string;
}

// --- Metadata ---

export async function generateMetadata({
  params,
}: GardenPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("public_slug", slug)
    .single();

  if (!profile) {
    return { title: "Garden Not Found" };
  }

  return {
    title: `${profile.name}'s Garden`,
    description: `${profile.name}'s garden, grown with help from Hazel.`,
  };
}

// --- Page ---

export default async function GardenPage({ params }: GardenPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("public_slug", slug)
    .single();

  if (profileError) {
    console.error("[GARDEN PAGE] Profile lookup failed:", slug, profileError);
  }
  if (!profile) notFound();

  // Fetch garden
  const { data: garden } = await supabase
    .from("gardens")
    .select("id, name")
    .eq("owner_id", profile.id)
    .single();

  if (!garden) notFound();

  // Fetch plants, spaces, and logs in parallel
  const [plantsResult, spacesResult] = await Promise.all([
    supabase
      .from("plants")
      .select("id, common_name, latin_name, category, notes, created_at")
      .eq("garden_id", garden.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("spaces")
      .select("id, name, type, description, background_image_url, plant_positions")
      .eq("garden_id", garden.id)
      .order("created_at", { ascending: true }),
  ]);

  const plants: DbPlant[] = plantsResult.data || [];
  const spaces: DbSpace[] = spacesResult.data || [];

  // Fetch latest log entry per plant (for photos)
  const plantIds = plants.map((p) => p.id);
  const logsByPlant: Record<string, PlantLog> = {};

  if (plantIds.length > 0) {
    const { data: logs } = await supabase
      .from("log_entries")
      .select("plant_id, cloudinary_url, caption")
      .in("plant_id", plantIds)
      .order("date", { ascending: false });

    for (const log of logs || []) {
      if (log.plant_id && !logsByPlant[log.plant_id]) {
        logsByPlant[log.plant_id] = {
          cloudinary_url: log.cloudinary_url || "",
          caption: log.caption || "",
        };
      }
    }
  }

  // Build a plant lookup and track which plants are assigned to spaces
  const plantMap = new Map<string, DbPlant>();
  for (const p of plants) {
    plantMap.set(p.id, p);
  }

  const assignedPlantIds = new Set<string>();
  for (const space of spaces) {
    for (const pos of space.plant_positions || []) {
      assignedPlantIds.add(pos.plantId);
    }
  }

  // Unassigned plants go into "Around the Garden"
  const unassignedPlants = plants.filter((p) => !assignedPlantIds.has(p.id));

  const plantCount = plants.length;
  const spaceCount = spaces.length;
  const whatsappNumber = process.env.NEXT_PUBLIC_HAZEL_PHONE_NUMBER || "";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\+/g, "")}?text=Hello%20Hazel`;

  return (
    <div className="min-h-screen bg-garden-cream">
      {/* Hero */}
      <header className="bg-garden-greenLight border-b border-garden-border">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <p className="text-body-sm text-garden-greenBright font-medium mb-2 tracking-wide uppercase">
            Grown with Hazel
          </p>
          <h1 className="text-heading-lg text-garden-text mb-3">
            {profile.name}&apos;s Garden
          </h1>
          <div className="flex items-center justify-center gap-6 text-body-sm text-garden-textMuted">
            <span>
              {plantCount} {plantCount === 1 ? "plant" : "plants"}
            </span>
            {spaceCount > 0 && (
              <>
                <span className="text-garden-border">|</span>
                <span>
                  {spaceCount} {spaceCount === 1 ? "space" : "spaces"}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {plantCount === 0 ? (
          /* Empty garden */
          <div className="max-w-2xl mx-auto px-4 py-20 text-center">
            <div className="text-6xl mb-6">🌱</div>
            <p className="text-heading-sm text-garden-text mb-2">
              This garden is just getting started
            </p>
            <p className="text-body text-garden-textMuted">
              Check back soon to see what&apos;s growing.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Space sections */}
            {spaces.map((space) => {
              const spacePositions = space.plant_positions || [];
              const spacePlants = spacePositions
                .map((pos) => plantMap.get(pos.plantId))
                .filter((p): p is DbPlant => p !== undefined);
              const subtypeByPlantId = new Map<string, SpaceSubtype | undefined>();
              for (const pos of spacePositions) {
                subtypeByPlantId.set(pos.plantId, pos.subtype);
              }

              if (spacePlants.length === 0) return null;

              const bgUrl = space.background_image_url
                ? heroImage(space.background_image_url)
                : null;

              return (
                <section key={space.id} className="relative">
                  {/* Space header with optional background */}
                  {bgUrl ? (
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bgUrl}
                        alt={space.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 px-6 py-5">
                        <div className="max-w-3xl mx-auto">
                          <h2 className="text-heading text-white flex items-center gap-3">
                            <span>{spaceIcon(space.type)}</span>
                            {space.name}
                          </h2>
                          {space.description && (
                            <p className="text-body-sm text-white/80 mt-1">
                              {space.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-b border-garden-border px-6 py-6">
                      <div className="max-w-3xl mx-auto">
                        <h2 className="text-heading text-garden-text flex items-center gap-3">
                          <span>{spaceIcon(space.type)}</span>
                          {space.name}
                        </h2>
                        {space.description && (
                          <p className="text-body-sm text-garden-textMuted mt-1">
                            {space.description}
                          </p>
                        )}
                        <p className="text-label text-garden-textMuted mt-1">
                          {spacePlants.length}{" "}
                          {spacePlants.length === 1 ? "plant" : "plants"} in{" "}
                          {spaceLabel(space.type).toLowerCase()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Plant cards grid */}
                  <div className="max-w-3xl mx-auto px-4 py-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {spacePlants.map((plant) => (
                        <PlantCard
                          key={plant.id}
                          plant={plant}
                          log={logsByPlant[plant.id]}
                          subtype={subtypeByPlantId.get(plant.id)}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Unassigned plants: "Around the Garden" */}
            {unassignedPlants.length > 0 && (
              <section>
                <div className="bg-white border-b border-garden-border px-6 py-6">
                  <div className="max-w-3xl mx-auto">
                    <h2 className="text-heading text-garden-text flex items-center gap-3">
                      <span>🌿</span>
                      {spaces.length > 0 ? "Around the Garden" : "The Garden"}
                    </h2>
                    {spaces.length > 0 && (
                      <p className="text-label text-garden-textMuted mt-1">
                        {unassignedPlants.length}{" "}
                        {unassignedPlants.length === 1
                          ? "plant"
                          : "plants"}{" "}
                        not yet placed in a space
                      </p>
                    )}
                  </div>
                </div>
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {unassignedPlants.map((plant) => (
                      <PlantCard
                        key={plant.id}
                        plant={plant}
                        log={logsByPlant[plant.id]}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-garden-border bg-white px-6 py-10 text-center">
        <p className="text-body-sm text-garden-textMuted mb-4">
          Grown with help from Hazel
        </p>
        {whatsappNumber && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-body-sm transition-colors hover:bg-[#1da851]"
          >
            🌱 Start your garden with Hazel
          </a>
        )}
      </footer>
    </div>
  );
}

// --- Plant Card Component ---

function PlantCard({
  plant,
  log,
  subtype,
}: {
  plant: DbPlant;
  log?: PlantLog;
  subtype?: SpaceSubtype;
}) {
  const photoUrl = log?.cloudinary_url ? thumbnail(log.cloudinary_url) : null;
  const plantDate = plant.created_at
    ? new Date(plant.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";
  const categoryIcon = CATEGORY_ICONS[plant.category || ""] || "";

  return (
    <div className="border border-garden-border rounded-xl overflow-hidden bg-white">
      {photoUrl ? (
        <div className="aspect-square bg-garden-offwhite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={plant.common_name || "Plant photo"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-square bg-garden-offwhite flex items-center justify-center">
          <span className="text-4xl">{categoryIcon || "🌿"}</span>
        </div>
      )}
      <div className="p-3">
        <h3 className="font-semibold text-garden-text text-body-sm leading-tight">
          {plant.common_name || "Unknown Plant"}
        </h3>
        {plant.latin_name && (
          <p className="text-label text-garden-textMuted italic truncate">
            {plant.latin_name}
          </p>
        )}
        {plantDate && (
          <p className="text-label text-garden-textMuted mt-1">{plantDate}</p>
        )}
        {subtype && (
          <p className="text-label text-garden-textMuted">
            {SUBTYPE_INFO[subtype]?.icon} {SUBTYPE_INFO[subtype]?.label}
          </p>
        )}
      </div>
    </div>
  );
}
