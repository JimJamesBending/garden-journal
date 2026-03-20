"use client";

import { motion } from "framer-motion";

type HazelMood =
  | "looking"      // Idle, expectant
  | "searching"    // Magnifying glass, examining
  | "asking"       // Question mark, curious
  | "working"      // Filing papers, busy
  | "celebrating"; // Checkmark, happy

interface HazelMascotProps {
  mood: HazelMood;
  message: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MOOD_EMOJI: Record<HazelMood, string> = {
  looking: "\u{1F42D}",      // mouse
  searching: "\u{1F50D}",    // magnifying glass
  asking: "\u{1F914}",       // thinking
  working: "\u{1F4DD}",      // writing
  celebrating: "\u{1F389}",  // party
};

const MOOD_BG: Record<HazelMood, string> = {
  looking: "bg-moss-800/40",
  searching: "bg-parchment-800/20",
  asking: "bg-moss-700/30",
  working: "bg-earth-800/30",
  celebrating: "bg-moss-600/20",
};

const SIZE_CLASSES = {
  sm: { wrapper: "gap-2", emoji: "text-2xl w-10 h-10", bubble: "text-sm py-2 px-3" },
  md: { wrapper: "gap-3", emoji: "text-4xl w-14 h-14", bubble: "text-base py-3 px-4" },
  lg: { wrapper: "gap-4", emoji: "text-5xl w-20 h-20", bubble: "text-lg py-4 px-5" },
};

export function HazelMascot({
  mood,
  message,
  size = "md",
  className = "",
}: HazelMascotProps) {
  const s = SIZE_CLASSES[size];

  return (
    <div className={`flex items-start ${s.wrapper} ${className}`}>
      {/* Hazel character */}
      <motion.div
        className={`${s.emoji} rounded-full ${MOOD_BG[mood]} flex items-center justify-center flex-shrink-0`}
        animate={{
          y: [0, -3, 0],
          scale: mood === "celebrating" ? [1, 1.1, 1] : 1,
        }}
        transition={{
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
        }}
      >
        <span>{MOOD_EMOJI[mood]}</span>
      </motion.div>

      {/* Speech bubble */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className={`relative bg-moss-800/50 border border-moss-700/30 rounded-2xl rounded-tl-sm ${s.bubble} max-w-sm`}
      >
        {/* Bubble tail */}
        <div className="absolute -left-2 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-moss-700/30 border-b-[6px] border-b-transparent" />
        <p className="font-body text-parchment-300 leading-relaxed">
          {message}
        </p>
      </motion.div>
    </div>
  );
}
