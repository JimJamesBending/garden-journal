import { ImageResponse } from "@vercel/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlantImpact } from "@/lib/plant-impact";
import type { ImpactStat } from "@/lib/plant-impact";

export const runtime = "edge";

function getDaysSince(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatAge(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Day 1";
  if (days < 7) return `Day ${days}`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return "1 month";
  return `${Math.floor(days / 30)} months`;
}

/** Render filled/empty stars as text */
function renderStars(filled: number): string {
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

/** Grade colour — warm greens for high grades, amber/grey for lower */
function gradeColour(grade: string): string {
  if (grade.startsWith("A")) return "#4ade80"; // bright green
  if (grade.startsWith("B")) return "#fbbf24"; // amber
  return "#9ca3af"; // grey
}

/** Stat bar fill colour */
function barFillColour(index: number): string {
  return index === 0 ? "#4ade80" : "#86efac";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ plantId: string }> }
) {
  const { plantId } = await params;
  const supabase = createAdminClient();

  // Fetch plant data
  const { data: plant } = await supabase
    .from("plants")
    .select(
      "common_name, latin_name, category, created_at, sow_date, garden_id"
    )
    .eq("id", plantId)
    .single();

  if (!plant) {
    return new Response("Not found", { status: 404 });
  }

  // Fetch latest photo
  const { data: log } = await supabase
    .from("log_entries")
    .select("cloudinary_url")
    .eq("plant_id", plantId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  // Crop tighter on the plant — fill card, focus on subject
  const photoUrl = log?.cloudinary_url
    ? log.cloudinary_url.replace(
        /\/upload\//,
        "/upload/w_800,h_500,c_fill,g_auto:subject,q_auto/"
      )
    : null;

  const days = getDaysSince(plant.sow_date || plant.created_at);
  const age = formatAge(days);

  // Category label
  const categoryLabel: Record<string, string> = {
    fruit: "Fruit",
    vegetable: "Vegetable",
    herb: "Herb",
    flower: "Flower",
  };
  const category = categoryLabel[plant.category] || "Plant";

  // Determine location — default to outdoor for now
  // TODO: when spaces feature is built, use space.type
  const location: "indoor" | "outdoor" = "outdoor";

  // Get ecological impact data
  const validCategory = (["flower", "herb", "vegetable", "fruit"].includes(
    plant.category
  )
    ? plant.category
    : "flower") as "flower" | "herb" | "vegetable" | "fruit";

  const impact = getPlantImpact(
    plant.common_name || "",
    plant.latin_name || "",
    validCategory,
    location,
    days
  );

  const stars = renderStars(impact.gradeStars);
  const gradeCol = gradeColour(impact.impactGrade);

  return new ImageResponse(
    (
      <div
        style={{
          width: 800,
          height: 500,
          display: "flex",
          position: "relative",
        }}
      >
        {/* Background — plant photo or gradient fallback */}
        {photoUrl ? (
          <img
            src={photoUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 800,
              height: 500,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 800,
              height: 500,
              background:
                "linear-gradient(135deg, #1a3a0a 0%, #2d5016 50%, #4a7c23 100%)",
            }}
          />
        )}

        {/* Dark gradient overlay — bottom 60% */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 800,
            height: 320,
            display: "flex",
            background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
          }}
        />

        {/* Subtle top vignette */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 800,
            height: 80,
            display: "flex",
            background: "linear-gradient(rgba(0,0,0,0.3), transparent)",
          }}
        />

        {/* Category pill — top left */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 24,
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 24,
            padding: "8px 18px",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.9)",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {category}
          </span>
        </div>

        {/* Hazel branding — top right */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 24,
            padding: "8px 18px",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.9)",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Hazel
          </span>
        </div>

        {/* Bottom content area */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 28,
            right: 28,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Name row — plant name + grade */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            {/* Plant name */}
            <span
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "white",
                fontFamily: "Georgia, serif",
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                lineHeight: 1.1,
              }}
            >
              {plant.common_name}
            </span>

            {/* Grade + stars */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: gradeCol,
                  letterSpacing: "0.06em",
                }}
              >
                {stars}
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: gradeCol,
                  fontFamily: "Georgia, serif",
                }}
              >
                {impact.impactGrade}
              </span>
            </div>
          </div>

          {/* Latin name */}
          <span
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.65)",
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}
          >
            {plant.latin_name}
          </span>

          {/* Impact stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 24,
              marginTop: 12,
            }}
          >
            {/* Stat 1 */}
            {renderStatBlock(impact.primaryStats[0], 0)}

            {/* Stat 2 */}
            {renderStatBlock(impact.primaryStats[1], 1)}

            {/* Age — pushed to far right */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: "auto",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Age
              </span>
              <span
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                }}
              >
                {age}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 500,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}

/** Render a single impact stat with emoji, label, and progress bar */
function renderStatBlock(stat: ImpactStat, index: number) {
  const fillPct = Math.min(100, Math.round((stat.value / stat.maxValue) * 100));
  const fillCol = barFillColour(index);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* Emoji + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16 }}>{stat.emoji}</span>
        <span
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 500,
          }}
        >
          {stat.label}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          display: "flex",
          width: 120,
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fillPct}%`,
            height: 6,
            borderRadius: 3,
            background: fillCol,
          }}
        />
      </div>
    </div>
  );
}
