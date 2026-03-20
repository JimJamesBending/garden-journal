import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getPlants,
  getLogs,
  getCareEvents,
  getGrowth,
  getAdvice,
  saveAdvice,
  getSpaces,
  getGardenId,
} from "@/lib/supabase/queries";
import { fetchWeather, getGardeningContext, getWateringAdvice, getFrostAlert } from "@/lib/weather";
import { generateAdvice } from "@/lib/advice-engine";
import { FrontPage } from "./FrontPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Not logged in: show static landing page ---
  if (!user) {
    return (
      <div className="min-h-screen bg-night-950 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-5xl md:text-7xl font-light text-parchment-300 mb-4">
          Garden Journal
        </h1>
        <p className="font-body text-lg md:text-xl text-parchment-500 max-w-md mb-10">
          Track your seedlings from sowing to harvest. An AI-powered gardening
          companion that anticipates, advises, and helps you grow.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="font-mono text-sm px-6 py-2.5 rounded border border-moss-600 text-parchment-300 hover:bg-moss-900/40 hover:border-moss-400 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="font-mono text-sm px-6 py-2.5 rounded bg-moss-700 text-parchment-200 hover:bg-moss-600 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  // --- Logged in: fetch data and render full front page ---
  const gardenId = await getGardenId(supabase);

  const [plants, logs, careEvents, growth, spaces] = await Promise.all([
    getPlants(supabase, gardenId),
    getLogs(supabase, gardenId),
    getCareEvents(supabase, gardenId),
    getGrowth(supabase, gardenId),
    getSpaces(supabase, gardenId),
  ]);

  // Fetch weather (with fallback)
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
  } catch (e) {
    console.warn("Weather fetch failed:", e);
  }

  // Generate advice (cached daily)
  let advice = await getAdvice(supabase, gardenId);
  const today = new Date().toISOString().split("T")[0];
  const isFresh = advice.length > 0 && advice[0]?.generatedAt?.startsWith(today);

  if (!isFresh) {
    let forecast = null;
    try {
      forecast = await fetchWeather();
    } catch {}
    advice = generateAdvice(plants, careEvents, growth, forecast);
    try {
      await saveAdvice(supabase, gardenId, advice);
    } catch {}
  }

  return (
    <FrontPage
      plants={plants}
      logs={logs}
      weather={weather}
      advice={advice}
      spaces={spaces}
    />
  );
}
