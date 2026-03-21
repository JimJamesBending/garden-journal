import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { thumbnail } from "@/lib/cloudinary";

interface GardenPageProps {
  params: Promise<{ slug: string }>;
}

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
    title: `${profile.name}'s Garden — Hazel`,
    description: `A garden grown with help from Hazel, your AI gardening companion.`,
  };
}

export default async function GardenPage({ params }: GardenPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Fetch profile by slug
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("public_slug", slug)
    .single();

  if (profileError) {
    console.error("[GARDEN PAGE] Profile lookup failed for slug:", slug, profileError);
  }

  if (!profile) {
    notFound();
  }

  // Fetch garden
  const { data: garden } = await supabase
    .from("gardens")
    .select("id, name")
    .eq("owner_id", profile.id)
    .single();

  if (!garden) {
    notFound();
  }

  // Fetch plants with their latest log entry photo
  const { data: plants } = await supabase
    .from("plants")
    .select(
      "id, common_name, latin_name, category, notes, created_at"
    )
    .eq("garden_id", garden.id)
    .order("created_at", { ascending: false });

  // Fetch latest log entry per plant (for photos)
  const plantIds = (plants || []).map((p) => p.id);
  let logsByPlant: Record<string, { cloudinary_url: string; caption: string }> = {};

  if (plantIds.length > 0) {
    const { data: logs } = await supabase
      .from("log_entries")
      .select("plant_id, cloudinary_url, caption")
      .in("plant_id", plantIds)
      .order("date", { ascending: false });

    // Take first log per plant (most recent)
    for (const log of logs || []) {
      if (log.plant_id && !logsByPlant[log.plant_id]) {
        logsByPlant[log.plant_id] = {
          cloudinary_url: log.cloudinary_url || "",
          caption: log.caption || "",
        };
      }
    }
  }

  const plantCount = plants?.length || 0;
  const whatsappNumber = process.env.NEXT_PUBLIC_HAZEL_PHONE_NUMBER || "";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\+/g, "")}?text=Hello%20Hazel`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-garden-greenLight border-b border-garden-border px-6 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-heading-lg text-garden-text mb-2">
            {profile.name}&apos;s Garden
          </h1>
          <p className="text-body text-garden-textMuted">
            {plantCount} {plantCount === 1 ? "plant" : "plants"} growing with
            Hazel
          </p>
        </div>
      </header>

      {/* Plant Grid */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {plantCount === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-body text-garden-textMuted mb-6">
              This garden is just getting started. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(plants || []).map((plant) => {
              const log = logsByPlant[plant.id];
              const photoUrl = log?.cloudinary_url
                ? thumbnail(log.cloudinary_url)
                : null;
              const plantDate = plant.created_at
                ? new Date(plant.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "";

              return (
                <div
                  key={plant.id}
                  className="border border-garden-border rounded-xl overflow-hidden bg-white"
                >
                  {photoUrl ? (
                    <div className="aspect-square bg-garden-offwhite">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={plant.common_name || "Plant photo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-garden-offwhite flex items-center justify-center">
                      <span className="text-4xl">🌿</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-garden-text text-lg">
                      {plant.common_name || "Unknown Plant"}
                    </h3>
                    {plant.latin_name && (
                      <p className="text-sm text-garden-textMuted italic">
                        {plant.latin_name}
                      </p>
                    )}
                    {plant.notes && (
                      <p className="text-sm text-garden-textMuted mt-2 line-clamp-2">
                        {plant.notes}
                      </p>
                    )}
                    <p className="text-xs text-garden-textMuted mt-2">
                      Added {plantDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-garden-border px-6 py-8 text-center">
        <p className="text-sm text-garden-textMuted mb-3">
          Grown with help from Hazel
        </p>
        {whatsappNumber && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm transition-colors hover:bg-[#1da851]"
          >
            🌱 Start your garden with Hazel
          </a>
        )}
      </footer>
    </div>
  );
}
