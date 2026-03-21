import { ImageResponse } from "@vercel/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlantImpact } from "@/lib/plant-impact";

export const runtime = "edge";

/**
 * Load a Google Font dynamically.
 * Fetches the CSS from Google Fonts, extracts the font file URL,
 * and returns the binary data as an ArrayBuffer.
 */
async function loadGoogleFont(
  font: string,
  text: string
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (
    await fetch(url, {
      headers: {
        // Request TrueType format (not woff2 which Satori can't handle)
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    })
  ).text();

  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!match || !match[1]) {
    throw new Error(`Failed to extract font URL for: ${font}`);
  }

  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`Failed to download font: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}

function getDaysSince(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatAge(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return "1 month";
  return `${Math.floor(days / 30)} months`;
}

/** Category emoji */
function categoryEmoji(cat: string): string {
  const emojis: Record<string, string> = {
    flower: "\uD83C\uDF38",
    herb: "\uD83C\uDF3F",
    vegetable: "\uD83E\uDD66",
    fruit: "\uD83C\uDF4E",
  };
  return emojis[cat] || "\uD83C\uDF31";
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

  // Use the photo as-is — don't try to auto-crop because wide garden
  // shots get cropped to fence/background. Just resize to fit the card.
  const photoUrl = log?.cloudinary_url
    ? log.cloudinary_url.replace(
        /\/upload\//,
        "/upload/w_800,h_500,c_fill,g_center,q_auto/"
      )
    : null;

  const days = getDaysSince(plant.sow_date || plant.created_at);
  const age = formatAge(days);
  const emoji = categoryEmoji(plant.category);

  // Category label
  const categoryLabel: Record<string, string> = {
    fruit: "Fruit",
    vegetable: "Vegetable",
    herb: "Herb",
    flower: "Flower",
  };
  const category = categoryLabel[plant.category] || "Plant";

  // Get ecological impact data
  const validCategory = (["flower", "herb", "vegetable", "fruit"].includes(plant.category)
    ? plant.category
    : "flower") as "flower" | "herb" | "vegetable" | "fruit";
  // Don't pass days — show seasonal potential, not age-scaled.
  // A brand-new lavender showing "~0 bees" looks wrong on the card.
  const impact = getPlantImpact(
    plant.common_name,
    plant.latin_name || "",
    validCategory,
    "outdoor"
  );

  // Build the text that needs the serif font (for subset loading)
  const impactText = impact.primaryStats.map((s) => s.label).join("");
  const serifText = `${plant.common_name || "Plant"}${plant.latin_name || ""}${category}Hazel${impact.impactGrade}${impactText}`;

  // Load Playfair Display (beautiful editorial serif)
  const [playfairRegular, playfairBold, playfairItalic] = await Promise.all([
    loadGoogleFont("Playfair+Display", serifText),
    loadGoogleFont("Playfair+Display:wght@700", serifText),
    loadGoogleFont("Playfair+Display:ital@1", serifText),
  ]);

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
        {/* Background — plant photo or deep green gradient */}
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
                "linear-gradient(145deg, #0f2b0a 0%, #1a4012 40%, #2d5a1e 100%)",
            }}
          />
        )}

        {/* Bottom gradient — elegant fade to dark */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 800,
            height: 280,
            display: "flex",
            background:
              "linear-gradient(transparent, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.92))",
          }}
        />

        {/* Subtle top vignette */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 800,
            height: 60,
            display: "flex",
            background: "linear-gradient(rgba(0,0,0,0.2), transparent)",
          }}
        />

        {/* Hazel branding — top right, subtle */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "Playfair Display",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "0.04em",
            }}
          >
            Hazel
          </span>
        </div>

        {/* Bottom content area */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 32px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Thin decorative line */}
          <div
            style={{
              width: 40,
              height: 1,
              background: "rgba(255,255,255,0.3)",
              marginBottom: 16,
              display: "flex",
            }}
          />

          {/* Plant name — large, elegant serif */}
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "white",
              fontFamily: "Playfair Display",
              lineHeight: 1.05,
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}
          >
            {plant.common_name}
          </span>

          {/* Latin name — italic serif */}
          {plant.latin_name && (
            <span
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.55)",
                fontFamily: "Playfair Display",
                fontStyle: "italic",
                marginTop: 4,
              }}
            >
              {plant.latin_name}
            </span>
          )}

          {/* Bottom row: category + impact stats + age */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            {/* Category with emoji */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "Playfair Display",
                  fontWeight: 400,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {category}
              </span>
            </div>

            {/* Impact stats — two pill badges + grade */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {/* Stat 1 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  padding: "4px 10px",
                }}
              >
                <span style={{ fontSize: 12 }}>{impact.primaryStats[0].emoji}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Playfair Display",
                    fontWeight: 400,
                  }}
                >
                  {impact.primaryStats[0].label}
                </span>
              </div>
              {/* Stat 2 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  padding: "4px 10px",
                }}
              >
                <span style={{ fontSize: 12 }}>{impact.primaryStats[1].emoji}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Playfair Display",
                    fontWeight: 400,
                  }}
                >
                  {impact.primaryStats[1].label}
                </span>
              </div>
              {/* Impact grade badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(76,175,80,0.25)",
                  borderRadius: 20,
                  padding: "4px 10px",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "Playfair Display",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  {impact.impactGrade}
                </span>
              </div>
            </div>

            {/* Age */}
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Playfair Display",
                fontWeight: 400,
                letterSpacing: "0.06em",
              }}
            >
              {age}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 500,
      fonts: [
        {
          name: "Playfair Display",
          data: playfairRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Playfair Display",
          data: playfairBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Playfair Display",
          data: playfairItalic,
          weight: 400,
          style: "italic",
        },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
