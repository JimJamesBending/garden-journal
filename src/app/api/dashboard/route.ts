import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGardenId,
  getPlants,
  getLogs,
  getGrowth,
  getCareEvents,
  getSoilReadings,
  getAdvice,
  saveAdvice,
} from "@/lib/supabase/queries";
import { fetchWeather, getGardeningContext, getWateringAdvice, getFrostAlert } from "@/lib/weather";
import { generateAdvice } from "@/lib/advice-engine";

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

    const [plants, logs, growth, care, soil] = await Promise.all([
      getPlants(supabase, gardenId),
      getLogs(supabase, gardenId),
      getGrowth(supabase, gardenId),
      getCareEvents(supabase, gardenId),
      getSoilReadings(supabase, gardenId),
    ]);

    // Advice: check cache freshness, regenerate if stale
    let advice = await getAdvice(supabase, gardenId);
    const today = new Date().toISOString().split("T")[0];
    const isFresh = advice.length > 0 && advice[0]?.generatedAt?.startsWith(today);

    let weather = null;
    try {
      const forecast = await fetchWeather();
      weather = {
        current: forecast.current,
        daily: forecast.daily.map((d) => ({
          ...d,
          gardeningContext: getGardeningContext(d),
        })),
        advice: {
          watering: getWateringAdvice(forecast),
          frostAlert: getFrostAlert(forecast),
        },
      };

      if (!isFresh) {
        advice = generateAdvice(plants, care, growth, forecast);
        try { await saveAdvice(supabase, gardenId, advice); } catch {}
      }
    } catch {
      if (!isFresh) {
        advice = generateAdvice(plants, care, growth, null);
        try { await saveAdvice(supabase, gardenId, advice); } catch {}
      }
    }

    // Filter expired/dismissed advice
    advice = advice.filter(
      (a) => !a.dismissed && (!a.expiresAt || new Date(a.expiresAt) > new Date())
    );

    return NextResponse.json({ plants, logs, growth, care, advice, weather, soil });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
