"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { LogEntry } from "@/lib/types";
import { heroBackground, heroForeground } from "@/lib/cloudinary";

interface HeroProps {
  totalPlants: number;
  totalPhotos: number;
  currentTemp?: number;
  weatherCondition?: string;
  logs: LogEntry[];
}

function getSeasonLabel(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

function getSeasonEmoji(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "\u{1F331}";
  if (month >= 5 && month <= 7) return "\u{2600}\u{FE0F}";
  if (month >= 8 && month <= 10) return "\u{1F342}";
  return "\u{2744}\u{FE0F}";
}

function getWeatherIcon(condition?: string): string {
  if (!condition) return "";
  const icons: Record<string, string> = {
    clear: "\u{2600}\u{FE0F}",
    "partly-cloudy": "\u{26C5}",
    cloudy: "\u{2601}\u{FE0F}",
    rain: "\u{1F327}\u{FE0F}",
    "heavy-rain": "\u{26C8}\u{FE0F}",
    drizzle: "\u{1F326}\u{FE0F}",
    snow: "\u{2744}\u{FE0F}",
    fog: "\u{1F32B}\u{FE0F}",
    thunderstorm: "\u{26A1}",
  };
  return icons[condition] || "";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, gardener";
  if (hour < 17) return "Good afternoon, gardener";
  return "Good evening, gardener";
}

export function HeroSection({
  totalPlants,
  totalPhotos,
  currentTemp,
  weatherCondition,
  logs,
}: HeroProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const fgY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  const season = getSeasonLabel();

  // Pick the best hero photo - prefer greenhouse overviews, fallback to any labeled photo
  const labeledLogs = logs.filter((l) => l.labeled && l.cloudinaryUrl);
  const overviewPhoto = labeledLogs.find(
    (l) => !l.plantId || l.plantId === ""
  );
  const heroPhoto = overviewPhoto || labeledLogs[0] || null;

  return (
    <section
      ref={ref}
      className="relative h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background - blurred photo or gradient */}
      <motion.div className="absolute inset-0" style={{ y, scale: bgScale }}>
        {heroPhoto ? (
          <>
            <img
              src={heroBackground(heroPhoto.cloudinaryUrl)}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-moss-950/70 via-moss-950/40 to-moss-950/80" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-moss-950 via-moss-900 to-moss-900" />
            <div className="absolute inset-0 bg-gradient-to-t from-moss-900/90 via-transparent to-transparent" />
          </>
        )}
      </motion.div>

      {/* Foreground hero photo - sharp, centred, subtle */}
      {heroPhoto && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ y: fgY }}
        >
          <motion.img
            src={heroForeground(heroPhoto.cloudinaryUrl)}
            alt="Garden overview"
            className="w-[80vw] sm:w-[60vw] md:w-[45vw] max-w-lg h-auto rounded-3xl shadow-2xl shadow-black/60 object-cover opacity-20 sm:opacity-25"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 0.25, scale: 1 }}
            transition={{ delay: 0.5, duration: 1.2 }}
          />
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        className="relative z-10 text-center px-6"
        style={{ opacity, scale }}
      >
        {/* Otter mascot + greeting */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-4"
        >
          <motion.span
            className="text-4xl sm:text-5xl inline-block"
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 2 }}
          >
            {"\u{1F9A6}"}
          </motion.span>
          <p className="font-body text-base sm:text-lg text-parchment-400/80 mt-2">
            {getGreeting()}!
          </p>
        </motion.div>

        {/* Season badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-moss-600/40 bg-moss-800/50 backdrop-blur-sm mb-6"
        >
          <span className="text-sm">{getSeasonEmoji()}</span>
          <span className="font-mono text-xs text-moss-300 uppercase tracking-widest">
            {season} {new Date().getFullYear()}
          </span>
          {currentTemp !== undefined && (
            <>
              <span className="text-moss-600">|</span>
              <span className="font-mono text-xs text-parchment-400">
                {getWeatherIcon(weatherCondition)} {Math.round(currentTemp)}{"\u00B0"}C
              </span>
            </>
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-parchment-200 mb-4 leading-[0.9]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1.2 }}
        >
          {"What Grows".split("").map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5 + i * 0.04,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
          <br />
          {"in Bristol".split("").map((char, i) => (
            <motion.span
              key={`b-${i}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.9 + i * 0.04,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subtitle - friendly otter companion */}
        <motion.p
          className="font-body text-base md:text-lg text-parchment-400/80 mb-10 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          Your friendly garden otter &mdash; tracking growth, reading the weather,
          and always happy to lend a paw.
        </motion.p>

        {/* Stats */}
        <motion.div
          className="flex justify-center gap-8 sm:gap-10 font-mono text-xs uppercase tracking-[0.2em]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
        >
          <div className="text-center">
            <motion.span
              className="block text-2xl text-parchment-300 font-display font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
            >
              {totalPlants}
            </motion.span>
            <span className="text-moss-500">Plants</span>
          </div>
          <div className="w-px bg-moss-700/50" />
          <div className="text-center">
            <motion.span
              className="block text-2xl text-parchment-300 font-display font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.1, duration: 0.5 }}
            >
              {totalPhotos}
            </motion.span>
            <span className="text-moss-500">Photos</span>
          </div>
          <div className="w-px bg-moss-700/50" />
          <div className="text-center">
            <motion.span
              className="block text-2xl text-parchment-300 font-display font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.5 }}
            >
              {Math.floor(
                (Date.now() - new Date("2025-03-18").getTime()) /
                  (1000 * 60 * 60 * 24)
              )}
            </motion.span>
            <span className="text-moss-500">Days</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.8 }}
      >
        <span className="font-mono text-[10px] text-moss-500 uppercase tracking-[0.3em]">
          Explore the garden
        </span>
        <motion.div
          className="w-5 h-8 rounded-full border border-moss-600/40 flex justify-center pt-1.5"
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <div className="w-1 h-2 rounded-full bg-parchment-500/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
