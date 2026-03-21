import { ImageResponse } from "@vercel/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ plantId: string }> }
) {
  const { plantId } = await params;
  const supabase = createAdminClient();

  // Fetch plant data
  const { data: plant } = await supabase
    .from("plants")
    .select("common_name, latin_name, category, notes")
    .eq("id", plantId)
    .single();

  if (!plant) {
    return new Response("Not found", { status: 404 });
  }

  // Fetch latest photo for this plant
  const { data: log } = await supabase
    .from("log_entries")
    .select("cloudinary_url")
    .eq("plant_id", plantId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const photoUrl = log?.cloudinary_url
    ? log.cloudinary_url.replace(/\/upload\//, "/upload/w_600,h_400,c_fill,g_auto,q_auto/")
    : null;

  const categoryEmoji: Record<string, string> = {
    fruit: "🍎",
    vegetable: "🥕",
    herb: "🌿",
    flower: "🌸",
  };
  const emoji = categoryEmoji[plant.category] || "🌱";

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 400,
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Background — plant photo or gradient */}
        {photoUrl ? (
          <img
            src={photoUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 600,
              height: 400,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 600,
              height: 400,
              background: "linear-gradient(135deg, #2d5016 0%, #4a7c23 100%)",
            }}
          />
        )}

        {/* Dark overlay for text readability */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 600,
            height: 200,
            display: "flex",
            background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
          }}
        />

        {/* Plant info at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            right: 24,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 36 }}>{emoji}</span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "white",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {plant.common_name}
            </span>
          </div>
          <span
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.8)",
              fontStyle: "italic",
              marginLeft: 48,
            }}
          >
            {plant.latin_name}
          </span>
        </div>

        {/* Hazel branding — top right */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 20,
            padding: "6px 14px",
          }}
        >
          <span style={{ fontSize: 14, color: "#2d5016", fontWeight: 600 }}>
            Hazel 🌿
          </span>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 400,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    }
  );
}
