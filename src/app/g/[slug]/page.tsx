import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ogImage } from "@/lib/cloudinary";
import { getCareProfile, getMonthlyTask, getCompanionAdvice, estimateHarvestDate } from "@/lib/plant-care";
import { getPlantImpact, type PlantImpact } from "@/lib/plant-impact";
import { SPACE_HIERARCHY, type SpaceType, type SpaceSubtype } from "@/lib/types";
import { GardenPageClient } from "./components/GardenPageClient";

// --- Types ---

interface GardenPageProps {
  params: Promise<{ slug: string }>;
}

interface DbPlant {
  id: string;
  slug: string;
  common_name: string;
  latin_name: string | null;
  category: string | null;
  variety: string | null;
  confidence: string | null;
  sow_date: string | null;
  location: string | null;
  notes: string | null;
  seed_source: string | null;
  created_at: string | null;
  garden_id: string;
}

interface DbLogEntry {
  id: string;
  plant_id: string;
  garden_id: string;
  date: string;
  cloudinary_url: string | null;
  caption: string | null;
  status: string | null;
  labeled: boolean | null;
}

interface DbGrowthEntry {
  id: string;
  plant_id: string;
  garden_id: string;
  date: string;
  height_cm: number | null;
  leaf_count: number | null;
  health_score: number | null;
  notes: string | null;
}

interface DbCareEvent {
  id: string;
  plant_id: string;
  garden_id: string;
  type: string;
  date: string;
  notes: string | null;
  quantity: string | null;
}

interface DbSpace {
  id: string;
  garden_id: string;
  name: string;
  type: SpaceType;
  description: string | null;
  background_image_url: string | null;
  plant_positions: Array<{ plantId: string; x: number; y: number; subtype?: SpaceSubtype }> | null;
}

interface ActivityFeedItem {
  type: "photo" | "care" | "planted";
  date: string;
  plantName: string;
  description: string;
  photoUrl?: string;
}

export interface GardenData {
  gardenName: string;
  ownerName: string;
  plants: Array<
    DbPlant & {
      careProfile: ReturnType<typeof getCareProfile>;
      impact: PlantImpact;
      harvestEstimate: ReturnType<typeof estimateHarvestDate>;
      monthlyTask: ReturnType<typeof getMonthlyTask>;
      companionAdvice: ReturnType<typeof getCompanionAdvice>;
    }
  >;
  spaces: DbSpace[];
  logsByPlant: Record<string, DbLogEntry[]>;
  growthByPlant: Record<string, DbGrowthEntry[]>;
  careByPlant: Record<string, DbCareEvent[]>;
  activityFeed: ActivityFeedItem[];
  heroPhotoUrl: string | null;
  season: string;
  seasonEmoji: string;
  plantCount: number;
  spaceCount: number;
  photoCount: number;
  whatsappLink: string;
}

// --- Season helpers ---

function getSeason(month: number): { season: string; seasonEmoji: string } {
  if (month === 12 || month === 1 || month === 2) {
    return { season: "Winter", seasonEmoji: "\u2744\uFE0F" };
  }
  if (month >= 3 && month <= 5) {
    return { season: "Spring", seasonEmoji: "\uD83C\uDF31" };
  }
  if (month >= 6 && month <= 8) {
    return { season: "Summer", seasonEmoji: "\u2600\uFE0F" };
  }
  return { season: "Autumn", seasonEmoji: "\uD83C\uDF42" };
}

// --- Metadata ---

export async function generateMetadata({
  params,
}: GardenPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("public_slug", slug)
    .single();

  if (!profile) {
    return { title: "Garden Not Found" };
  }

  const { data: garden } = await supabase
    .from("gardens")
    .select("id")
    .eq("owner_id", profile.id)
    .single();

  if (!garden) {
    return { title: "Garden Not Found" };
  }

  // Count plants for the description
  const { count: plantCount } = await supabase
    .from("plants")
    .select("id", { count: "exact", head: true })
    .eq("garden_id", garden.id);

  // Get hero photo for OG image
  const { data: latestLog } = await supabase
    .from("log_entries")
    .select("cloudinary_url")
    .eq("garden_id", garden.id)
    .not("cloudinary_url", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const appUrl =
    process.env.APP_URL || "https://garden-project-theta.vercel.app";
  const title = `${profile.name}'s Garden`;
  const description =
    plantCount && plantCount > 0
      ? `${plantCount} ${plantCount === 1 ? "plant" : "plants"} growing with Hazel`
      : `${profile.name}'s garden, grown with help from Hazel.`;

  const ogImageUrl = latestLog?.cloudinary_url
    ? ogImage(latestLog.cloudinary_url)
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/g/${slug}`,
      siteName: "Hazel",
      type: "website",
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: title,
              },
            ],
          }
        : {}),
    },
  };
}

// --- Page ---

export default async function GardenPage({ params }: GardenPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // 1. Fetch profile by slug
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("public_slug", slug)
    .single();

  if (profileError) {
    console.error("[GARDEN PAGE] Profile lookup failed:", slug, profileError);
  }
  if (!profile) notFound();

  // 2. Fetch garden by owner_id
  const { data: garden } = await supabase
    .from("gardens")
    .select("id, name")
    .eq("owner_id", profile.id)
    .single();

  if (!garden) notFound();

  // 3. Fetch everything in parallel
  const [plantsResult, spacesResult, logsResult, growthResult, careResult] =
    await Promise.all([
      supabase
        .from("plants")
        .select(
          "id, slug, common_name, latin_name, category, variety, confidence, sow_date, location, notes, seed_source, created_at, garden_id"
        )
        .eq("garden_id", garden.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("spaces")
        .select(
          "id, garden_id, name, type, description, background_image_url, plant_positions"
        )
        .eq("garden_id", garden.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("log_entries")
        .select(
          "id, plant_id, garden_id, date, cloudinary_url, caption, status, labeled"
        )
        .eq("garden_id", garden.id)
        .order("date", { ascending: false }),
      supabase
        .from("growth_entries")
        .select(
          "id, plant_id, garden_id, date, height_cm, leaf_count, health_score, notes"
        )
        .eq("garden_id", garden.id)
        .order("date", { ascending: false }),
      supabase
        .from("care_events")
        .select("id, plant_id, garden_id, type, date, notes, quantity")
        .eq("garden_id", garden.id)
        .order("date", { ascending: false }),
    ]);

  const plants: DbPlant[] = plantsResult.data || [];
  const spaces: DbSpace[] = spacesResult.data || [];
  const logs: DbLogEntry[] = logsResult.data || [];
  const growthEntries: DbGrowthEntry[] = growthResult.data || [];
  const careEvents: DbCareEvent[] = careResult.data || [];

  // Build plant lookup
  const plantMap = new Map<string, DbPlant>();
  for (const p of plants) {
    plantMap.set(p.id, p);
  }

  // Group logs, growth, care by plant
  const logsByPlant: Record<string, DbLogEntry[]> = {};
  for (const log of logs) {
    if (!log.plant_id) continue;
    if (!logsByPlant[log.plant_id]) logsByPlant[log.plant_id] = [];
    logsByPlant[log.plant_id].push(log);
  }

  const growthByPlant: Record<string, DbGrowthEntry[]> = {};
  for (const entry of growthEntries) {
    if (!entry.plant_id) continue;
    if (!growthByPlant[entry.plant_id]) growthByPlant[entry.plant_id] = [];
    growthByPlant[entry.plant_id].push(entry);
  }

  const careByPlant: Record<string, DbCareEvent[]> = {};
  for (const event of careEvents) {
    if (!event.plant_id) continue;
    if (!careByPlant[event.plant_id]) careByPlant[event.plant_id] = [];
    careByPlant[event.plant_id].push(event);
  }

  // 4. Compute per-plant data
  const enrichedPlants = plants.map((plant) => {
    const daysSinceSow = plant.sow_date
      ? Math.floor(
          (Date.now() - new Date(plant.sow_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined;

    const careProfile = getCareProfile(plant.common_name);

    const impact = getPlantImpact(
      plant.common_name,
      plant.latin_name || "",
      (plant.category as "flower" | "herb" | "vegetable" | "fruit") || "flower",
      (plant.location as "indoor" | "outdoor") || "outdoor",
      daysSinceSow
    );

    const harvestEstimate =
      plant.sow_date
        ? estimateHarvestDate(plant.common_name, plant.sow_date)
        : null;

    const monthlyTask = getMonthlyTask(plant.common_name);

    const companionAdvice = getCompanionAdvice(plant.common_name);

    return {
      ...plant,
      careProfile,
      impact,
      harvestEstimate,
      monthlyTask,
      companionAdvice,
    };
  });

  // 5. Build activity feed (merge logs + care events, sorted by date desc, capped at 20)
  const activityFeed: ActivityFeedItem[] = [];

  for (const log of logs) {
    const plant = log.plant_id ? plantMap.get(log.plant_id) : undefined;
    activityFeed.push({
      type: "photo",
      date: log.date,
      plantName: plant?.common_name || "Unknown plant",
      description: log.caption || "Photo logged",
      photoUrl: log.cloudinary_url || undefined,
    });
  }

  for (const event of careEvents) {
    const plant = event.plant_id ? plantMap.get(event.plant_id) : undefined;
    const eventType = event.type;
    // Treat "planted" type care events distinctly
    const feedType: ActivityFeedItem["type"] =
      eventType === "planted" ? "planted" : "care";
    const description =
      event.notes ||
      `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;

    activityFeed.push({
      type: feedType,
      date: event.date,
      plantName: plant?.common_name || "Unknown plant",
      description,
    });
  }

  // Sort by date descending and cap at 20
  activityFeed.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  activityFeed.splice(20);

  // 6. Select hero photo (first plant's latest photo)
  let heroPhotoUrl: string | null = null;
  if (plants.length > 0) {
    const firstPlantLogs = logsByPlant[plants[0].id];
    if (firstPlantLogs && firstPlantLogs.length > 0) {
      heroPhotoUrl = firstPlantLogs[0].cloudinary_url || null;
    }
  }

  // 7. Compute season from current month
  const currentMonth = new Date().getMonth() + 1;
  const { season, seasonEmoji } = getSeason(currentMonth);

  // 8. Count total photos
  const photoCount = logs.filter((l) => l.cloudinary_url).length;

  // WhatsApp link
  const whatsappNumber = process.env.NEXT_PUBLIC_HAZEL_PHONE_NUMBER || "";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\+/g, "")}?text=Hello%20Hazel`;

  // 9. Assemble all data for the client component
  const gardenData: GardenData = {
    gardenName: garden.name,
    ownerName: profile.name,
    plants: enrichedPlants,
    spaces,
    logsByPlant,
    growthByPlant,
    careByPlant,
    activityFeed,
    heroPhotoUrl,
    season,
    seasonEmoji,
    plantCount: plants.length,
    spaceCount: spaces.length,
    photoCount,
    whatsappLink,
  };

  return <GardenPageClient data={gardenData} />;
}
