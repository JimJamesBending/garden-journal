import { NextResponse } from "next/server";
import { getPlants, getCareEvents, getGrowth, getAdvice, saveAdvice } from "@/lib/blob";
import { generateAdvice } from "@/lib/advice-engine";
import { fetchWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check if we have fresh advice (generated today)
    const cached = await getAdvice();
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
      getPlants(),
      getCareEvents(),
      getGrowth(),
    ]);

    let forecast = null;
    try {
      forecast = await fetchWeather();
    } catch (e) {
      console.warn("Weather fetch failed, generating advice without weather:", e);
    }

    const advice = generateAdvice(plants, careEvents, growth, forecast);

    // Cache the generated advice
    await saveAdvice(advice);

    return NextResponse.json(advice);
  } catch (error) {
    console.error("Advice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate advice" },
      { status: 500 }
    );
  }
}
