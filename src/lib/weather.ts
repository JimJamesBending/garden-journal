import { WeatherSnapshot, WeatherForecast, WeatherCondition } from "./types";

// Bristol coordinates (default)
const DEFAULT_LAT = 51.4545;
const DEFAULT_LNG = -2.5879;

const WMO_CODES: Record<number, WeatherCondition> = {
  0: "clear",
  1: "clear",
  2: "partly-cloudy",
  3: "cloudy",
  45: "fog",
  48: "fog",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  61: "rain",
  63: "rain",
  65: "heavy-rain",
  71: "snow",
  73: "snow",
  75: "snow",
  80: "rain",
  81: "rain",
  82: "heavy-rain",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
};

function wmoToCondition(code: number): WeatherCondition {
  return WMO_CODES[code] || "partly-cloudy";
}

export async function fetchWeather(
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "uv_index",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "weather_code",
      "uv_index_max",
      "wind_speed_10m_max",
      "sunrise",
      "sunset",
    ].join(","),
    hourly: ["soil_temperature_6cm", "soil_moisture_3_to_9cm"].join(","),
    timezone: "Europe/London",
    forecast_days: "7",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { next: { revalidate: 1800 } } // Cache 30 min
  );

  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status}`);
  }

  const data = await res.json();

  // Get current hour's soil data
  const now = new Date();
  const currentHour = now.getHours();
  const soilTemp = data.hourly?.soil_temperature_6cm?.[currentHour] ?? 0;
  const soilMoisture = data.hourly?.soil_moisture_3_to_9cm?.[currentHour] ?? 0;

  // Build current snapshot
  const current: WeatherSnapshot = {
    date: now.toISOString().split("T")[0],
    tempMax: data.daily.temperature_2m_max[0],
    tempMin: data.daily.temperature_2m_min[0],
    tempCurrent: data.current.temperature_2m,
    precipitation: data.daily.precipitation_sum[0],
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    uvIndex: data.current.uv_index ?? data.daily.uv_index_max[0] ?? 0,
    soilTemp10cm: soilTemp,
    soilMoisture: soilMoisture,
    sunrise: data.daily.sunrise[0]?.split("T")[1] ?? "",
    sunset: data.daily.sunset[0]?.split("T")[1] ?? "",
    condition: wmoToCondition(data.current.weather_code),
    frostRisk: data.daily.temperature_2m_min[0] <= 2,
  };

  // Build 7-day forecast
  const daily: WeatherSnapshot[] = data.daily.temperature_2m_max.map(
    (_: number, i: number) => ({
      date: data.daily.time[i],
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      tempCurrent: (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2,
      precipitation: data.daily.precipitation_sum[i],
      humidity: data.current.relative_humidity_2m, // Current only from API
      windSpeed: data.daily.wind_speed_10m_max[i],
      uvIndex: data.daily.uv_index_max[i] ?? 0,
      soilTemp10cm: soilTemp, // Approximate with current
      soilMoisture: soilMoisture,
      sunrise: data.daily.sunrise[i]?.split("T")[1] ?? "",
      sunset: data.daily.sunset[i]?.split("T")[1] ?? "",
      condition: wmoToCondition(data.daily.weather_code[i]),
      frostRisk: data.daily.temperature_2m_min[i] <= 2,
    })
  );

  return { current, daily };
}

// --- Weather context for gardening advice ---

export function getWateringAdvice(forecast: WeatherForecast): string {
  const rainNext3Days = forecast.daily
    .slice(0, 3)
    .reduce((sum, d) => sum + d.precipitation, 0);

  if (rainNext3Days > 10) {
    return "Heavy rain forecast — skip watering for the next few days. Check drainage in pots to prevent waterlogging.";
  }
  if (rainNext3Days > 3) {
    return "Some rain coming — you can ease off watering. Keep an eye on seedlings in small pots though, they dry out fast.";
  }
  if (forecast.current.tempMax > 25) {
    return "Hot and dry — water deeply in the morning or evening. Seedlings in small pots may need watering twice daily.";
  }
  if (forecast.current.tempMax < 10) {
    return "Cool weather — most plants need less water now. Don't overwater in cold conditions, roots can rot.";
  }
  return "Moderate conditions — water when the top inch of soil feels dry. Check pots daily.";
}

export function getFrostAlert(forecast: WeatherForecast): string | null {
  const frostDays = forecast.daily.filter((d) => d.frostRisk);
  if (frostDays.length === 0) return null;

  const frostDate = frostDays[0].date;
  const dayName = new Date(frostDate).toLocaleDateString("en-GB", {
    weekday: "long",
  });

  return `Frost warning for ${dayName} night (min ${frostDays[0].tempMin}°C). Bring tender seedlings inside or cover with horticultural fleece. Tomatoes, peppers, and basil won't survive frost.`;
}

export function getGardeningContext(day: WeatherSnapshot): string {
  if (day.frostRisk) return "Too cold for outdoor work on tender plants";
  if (day.precipitation > 10) return "Too wet for digging or planting";
  if (day.windSpeed > 40) return "Very windy — secure tall plants and supports";
  if (day.tempMax > 28) return "Hot — water early morning or evening, avoid working in midday sun";
  if (day.tempMax >= 15 && day.precipitation < 2 && !day.frostRisk)
    return "Great day for planting out or garden work";
  if (day.tempMax >= 10 && day.precipitation < 5)
    return "Decent conditions for outdoor gardening";
  return "Cool but workable — wrap up warm for outdoor tasks";
}
