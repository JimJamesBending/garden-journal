import { ImageResponse } from "@vercel/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

function getDaysSince(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function formatAge(days: number): string {
  if (days === 0) return "Just added";
  if (days === 1) return "Day 1";
  if (days < 7) return `Day ${days}`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return "1 month";
  return `${Math.floor(days / 30)} months`;
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
    .select("common_name, latin_name, category, created_at, sow_date")
    .eq("id", plantId)
    .single();

  if (!plant) {
    return new Response("Not found", { status: 404 });
  }

  // Fetch latest photo + count of log entries for this plant
  const [{ data: log }, { count: photoCount }] = await Promise.all([
    supabase
      .from("log_entries")
      .select("cloudinary_url")
      .eq("plant_id", plantId)
      .order("date", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("log_entries")
      .select("*", { count: "exact", head: true })
      .eq("plant_id", plantId),
  ]);

  // Crop tighter on the plant — square crop, zoomed in
  const photoUrl = log?.cloudinary_url
    ? log.cloudinary_url.replace(
        /\/upload\//,
        "/upload/w_800,h_500,c_fill,g_auto:subject,q_auto/"
      )
    : null;

  const days = getDaysSince(plant.sow_date || plant.created_at);
  const age = formatAge(days);
  const photos = photoCount || 1;

  // Category label instead of emoji
  const categoryLabel: Record<string, string> = {
    fruit: "Fruit",
    vegetable: "Vegetable",
    herb: "Herb",
    flower: "Flower",
  };
  const category = categoryLabel[plant.category] || "Plant";

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
        {/* Background — plant photo cropped to subject, or gradient */}
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
              background: "linear-gradient(135deg, #1a3a0a 0%, #2d5016 50%, #4a7c23 100%)",
            }}
          />
        )}

        {/* Dark gradient overlay — bottom half */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 800,
            height: 280,
            display: "flex",
            background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
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
            backdropFilter: "blur(10px)",
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
            backdropFilter: "blur(10px)",
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

        {/* Plant info — bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 28,
            right: 28,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Plant name — large serif */}
          <span
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "white",
              fontFamily: "Georgia, serif",
              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              lineHeight: 1.1,
            }}
          >
            {plant.common_name}
          </span>

          {/* Latin name */}
          <span
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}
          >
            {plant.latin_name}
          </span>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 8,
            }}
          >
            {/* Age */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Age
              </span>
              <span
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 600,
                }}
              >
                {age}
              </span>
            </div>

            {/* Divider */}
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
              |
            </span>

            {/* Photos count */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Photos
              </span>
              <span
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 600,
                }}
              >
                {photos}
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
