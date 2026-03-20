import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGardenId, getPlants, getCareEvents, getGrowth, getAdvice, saveAdvice } from "@/lib/supabase/queries";
import { generateAdvice } from "@/lib/advice-engine";
import { fetchWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gardenId = await getGardenId(supabase);

    // Check if we have fresh advice (generated today)
    const cached = await getAdvice(supabase, gardenId);
    const today = new Date().toISOString().split("T")[0];
    const isFresh = cached.length > 0 && cached[0]?.generatedAt?.startsWith(today);

    if (isFresh) {
      // Return cached, filtering out dismissed and expired
      const active = cached.filter((a) => {
        if (a.dismissed) return false;
        if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
        return true;
      });
      return NextResponse.json(active);
    }

    // Generate fresh advice
    const [plants, careEvents, growth] = await Promise.all([
      getPlants(supabase, gardenId),
      getCareEvents(supabase, gardenId),
      getGrowth(supabase, gardenId),
    ]);

    let forecast = null;
    try {
      forecast = await fetchWeather();
    } catch (e) {
      console.warn("Weather fetch failed, generating advice without weather:", e);
    }

    const advice = generateAdvice(plants, careEvents, growth, forecast);

    // Cache the generated advice
    await saveAdvice(supabase, gardenId, advice);

    return NextResponse.json(advice);
  } catch (error) {
    console.error("Advice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate advice" },
      { status: 500 }
    );
  }
}
