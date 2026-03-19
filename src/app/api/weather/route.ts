import { NextResponse } from "next/server";
import { fetchWeather, getWateringAdvice, getFrostAlert, getGardeningContext } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const forecast = await fetchWeather();

    // Add gardening context to each day
    const dailyWithContext = forecast.daily.map((day) => ({
      ...day,
      gardeningContext: getGardeningContext(day),
    }));

    const wateringAdvice = getWateringAdvice(forecast);
    const frostAlert = getFrostAlert(forecast);

    return NextResponse.json({
      current: forecast.current,
      daily: dailyWithContext,
      advice: {
        watering: wateringAdvice,
        frostAlert,
      },
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
