"use client";

import { Plant, LogEntry, AdviceEntry, Space } from "@/lib/types";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { HeroSection } from "@/components/public/HeroSection";
import { PhotoShowcase } from "@/components/public/PhotoShowcase";
import { PlantShowcase } from "@/components/public/PlantShowcase";
import { WeatherDashboard } from "@/components/public/WeatherDashboard";
import { SpacesMap } from "@/components/public/SpacesMap";
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
  spaces: Space[];
}

export function FrontPage({ plants, logs, weather, advice, spaces }: FrontPageProps) {
  return (
    <div className="relative">
      <ScrollProgress />

      {/* 1. Hero — full viewport, photo background, dormouse mascot */}
      <HeroSection
        totalPlants={plants.length}
        totalPhotos={logs.filter((l) => l.labeled).length}
        currentTemp={weather?.current.tempCurrent}
        weatherCondition={weather?.current.condition}
        logs={logs}
      />

      {/* 2. Photo Showcase — horizontal scrolling strip */}
      <PhotoShowcase logs={logs} plants={plants} />

      {/* 3. Weather — compact expandable strip */}
      <WeatherDashboard weather={weather} />

      {/* 4. Spaces Map — interactive greenhouse map with plant pins */}
      <SpacesMap spaces={spaces} plants={plants} logs={logs} />

      {/* 5. Plant Collection — larger cards with photo backgrounds */}
      <PlantShowcase plants={plants} logs={logs} />

      {/* 6. AI Gardener advice */}
      <AIGardenerPreview advice={advice} />

      {/* 7. Photo journal timeline */}
      <PhotoTimeline logs={logs} plants={plants} />

      {/* 8. Footer */}
      <Footer />
    </div>
  );
}
