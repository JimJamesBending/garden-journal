"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface HeroProps {
  totalPlants: number;
  totalPhotos: number;
  currentTemp?: number;
  weatherCondition?: string;
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

export function HeroSection({
  totalPlants,
  totalPhotos,
  currentTemp,
  weatherCondition,
}: HeroProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  const season = getSeasonLabel();

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient layers */}
      <motion.div
        className="absolute inset-0"
        style={{ y }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-moss-950 via-moss-900 to-moss-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-moss-900/90 via-transparent to-transparent" />
        {/* Decorative botanical circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-moss-700/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-moss-700/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-parchment-400/10" />
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative z-10 text-center px-6"
        style={{ opacity, scale }}
      >
        {/* Season badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-moss-600/40 bg-moss-800/50 backdrop-blur-sm mb-8"
        >
          <span className="text-sm">{getSeasonEmoji()}</span>
          <span className="font-mono text-xs text-moss-300 uppercase tracking-widest">
            {season} {new Date().getFullYear()}
          </span>
          {currentTemp !== undefined && (
            <>
              <span className="text-moss-600">|</span>
              <span className="font-mono text-xs text-parchment-400">
                {getWeatherIcon(weatherCondition)} {Math.round(currentTemp)}°C
              </span>
            </>
          )}
        </motion.div>

        {/* Title — letter by letter reveal */}
        <motion.h1
          className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light text-parchment-200 mb-4 leading-[0.9]"
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

        {/* Subtitle */}
        <motion.p
          className="font-body text-lg md:text-xl text-parchment-500/80 mb-10 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          A living journal of growth, weather, and the quiet joy of watching
          things grow.
        </motion.p>

        {/* Stats */}
        <motion.div
          className="flex justify-center gap-10 font-mono text-xs uppercase tracking-[0.2em]"
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
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.8 }}
      >
        <span className="font-mono text-[10px] text-moss-500 uppercase tracking-[0.3em]">
          Scroll
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
