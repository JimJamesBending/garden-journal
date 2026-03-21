"use client";

import { motion } from "framer-motion";
import { heroBackground } from "@/lib/cloudinary";

interface GardenHeroProps {
  gardenName: string;
  ownerName: string;
  plantCount: number;
  spaceCount: number;
  photoCount: number;
  heroPhotoUrl: string | null;
  season: string;
  seasonEmoji: string;
}

export function GardenHero({
  gardenName,
  ownerName,
  plantCount,
  spaceCount,
  photoCount,
  heroPhotoUrl,
  season,
  seasonEmoji,
}: GardenHeroProps) {
  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <section className="relative bg-garden-greenLight overflow-hidden px-6 py-16 sm:py-20">
      {/* Blurred backdrop photo */}
      {heroPhotoUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroBackground(heroPhotoUrl)})`,
            opacity: 0.15,
          }}
        />
      )}

      {/* Content */}
      <motion.div
        className="relative max-w-3xl mx-auto text-center"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Label */}
        <motion.p
          className="text-xs uppercase tracking-widest text-garden-greenBright font-semibold mb-4"
          variants={fadeUp}
        >
          Grown with Hazel
        </motion.p>

        {/* Garden name */}
        <motion.h1
          className="text-4xl sm:text-5xl font-bold text-garden-text mb-3"
          variants={fadeUp}
        >
          {gardenName}
        </motion.h1>

        {/* Owner */}
        <motion.p
          className="text-garden-textMuted text-body mb-6"
          variants={fadeUp}
        >
          by {ownerName}
        </motion.p>

        {/* Season badge */}
        <motion.div className="mb-8" variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-garden-green text-body-sm font-medium px-4 py-1.5 rounded-full border border-garden-border">
            {seasonEmoji} {season}
          </span>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex items-center justify-center gap-4 text-garden-textMuted text-body-sm"
          variants={fadeUp}
        >
          <span className="font-semibold text-garden-text">{plantCount}</span>{" "}
          {plantCount === 1 ? "plant" : "plants"}
          <span className="text-garden-border">|</span>
          <span className="font-semibold text-garden-text">{spaceCount}</span>{" "}
          {spaceCount === 1 ? "space" : "spaces"}
          <span className="text-garden-border">|</span>
          <span className="font-semibold text-garden-text">{photoCount}</span>{" "}
          {photoCount === 1 ? "photo" : "photos"}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-10"
          variants={fadeUp}
        >
          <motion.svg
            className="mx-auto w-6 h-6 text-garden-greenBright"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
