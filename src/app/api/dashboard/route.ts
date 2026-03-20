import { NextResponse } from "next/server";
import { getPlants, getLogs, getGrowth, getCareEvents, getSoilReadings, getAdvice, saveAdvice } from "@/lib/blob";
import { fetchWeather, getGardeningContext, getWateringAdvice, getFrostAlert } from "@/lib/weather";
import { generateAdvice } from "@/lib/advice-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const [plants, logs, growth, care, soil] = await Promise.all([
    getPlants(),
    getLogs(),
    getGrowth(),
    getCareEvents(),
    getSoilReadings(),
  ]);

  // Advice: check cache freshness, regenerate if stale
  let advice = await getAdvice();
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
      try { await saveAdvice(advice); } catch {}
    }
  } catch {
    if (!isFresh) {
      advice = generateAdvice(plants, care, growth, null);
      try { await saveAdvice(advice); } catch {}
    }
  }

  // Filter expired/dismissed advice
  advice = advice.filter(
    (a) => !a.dismissed && (!a.expiresAt || new Date(a.expiresAt) > new Date())
  );

  return NextResponse.json({ plants, logs, growth, care, advice, weather, soil });
}
