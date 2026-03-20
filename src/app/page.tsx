import { getPlants, getLogs, getCareEvents, getGrowth, getAdvice, saveAdvice, getSpaces } from "@/lib/blob";
import { fetchWeather, getGardeningContext, getWateringAdvice, getFrostAlert } from "@/lib/weather";
import { generateAdvice } from "@/lib/advice-engine";
import { FrontPage } from "./FrontPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plants, logs, careEvents, growth, spaces] = await Promise.all([
    getPlants(),
    getLogs(),
    getCareEvents(),
    getGrowth(),
    getSpaces(),
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
  let advice = await getAdvice();
  const today = new Date().toISOString().split("T")[0];
  const isFresh = advice.length > 0 && advice[0]?.generatedAt?.startsWith(today);

  if (!isFresh) {
    let forecast = null;
    try {
      forecast = await fetchWeather();
    } catch {}
    advice = generateAdvice(plants, careEvents, growth, forecast);
    try {
      await saveAdvice(advice);
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
