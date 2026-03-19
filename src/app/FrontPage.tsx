"use client";

import { Plant, LogEntry, AdviceEntry } from "@/lib/types";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { HeroSection } from "@/components/public/HeroSection";
import { PlantShowcase } from "@/components/public/PlantShowcase";
import { WeatherDashboard } from "@/components/public/WeatherDashboard";
import { PhotoTimeline } from "@/components/public/PhotoTimeline";
import { AIGardenerPreview } from "@/components/public/AIGardenerPreview";
import { Footer } from "@/components/public/Footer";

interface FrontPageProps {
  plants: Plant[];
  logs: LogEntry[];
  weather: {
    current: {
      tempCurrent: number;
      tempMax: number;
      tempMin: number;
      humidity: number;
      windSpeed: number;
      uvIndex: number;
      soilTemp10cm: number;
      soilMoisture: number;
      sunrise: string;
      sunset: string;
      condition: string;
      frostRisk: boolean;
      precipitation: number;
    };
    daily: Array<{
      date: string;
      tempMax: number;
      tempMin: number;
      precipitation: number;
      condition: string;
      frostRisk: boolean;
      gardeningContext?: string;
      humidity: number;
      windSpeed: number;
      uvIndex: number;
      soilTemp10cm: number;
      soilMoisture: number;
      sunrise: string;
      sunset: string;
    }>;
    advice: {
      watering: string;
      frostAlert: string | null;
    };
  } | null;
  advice: AdviceEntry[];
}

export function FrontPage({ plants, logs, weather, advice }: FrontPageProps) {
  return (
    <div className="relative">
      <ScrollProgress />

      {/* Hero — full viewport */}
      <HeroSection
        totalPlants={plants.length}
        totalPhotos={logs.length}
        currentTemp={weather?.current.tempCurrent}
        weatherCondition={weather?.current.condition}
      />

      {/* Plant showcase with filter */}
      <PlantShowcase plants={plants} logs={logs} />

      {/* Weather dashboard */}
      <WeatherDashboard weather={weather} />

      {/* AI Gardener advice preview */}
      <AIGardenerPreview advice={advice} />

      {/* Photo journal timeline */}
      <PhotoTimeline logs={logs} plants={plants} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
