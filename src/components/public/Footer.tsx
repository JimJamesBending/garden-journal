"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const seasonalQuotes = [
  "To plant a garden is to believe in tomorrow. — Audrey Hepburn",
  "The glory of gardening: hands in the dirt, head in the sun, heart with nature.",
  "A garden is a friend you can visit any time.",
  "In every gardener there is a child who believes in the seed fairy.",
  "Gardening is the art that uses flowers and plants as paint, and the soil and sky as canvas.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
];

export function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const quote = seasonalQuotes[new Date().getDate() % seasonalQuotes.length];

  return (
    <footer ref={ref} className="border-t border-garden-border px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="font-sans text-sm text-garden-textMuted italic max-w-md mx-auto mb-8">
            &ldquo;{quote.split("—")[0].trim()}&rdquo;
            {quote.includes("—") && (
              <span className="block mt-2 not-italic text-garden-textMuted text-base">
                — {quote.split("—")[1].trim()}
              </span>
            )}
          </p>

          <div className="flex justify-center gap-6 mb-8">
            <a
              href="/garden"
              className="font-sans text-base text-garden-green hover:text-garden-greenBright transition-colors uppercase tracking-wider"
            >
              Portal
            </a>
            <span className="text-garden-border">|</span>
            <a
              href="https://github.com/JimJamesBending/garden-journal"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-base text-garden-green hover:text-garden-greenBright transition-colors uppercase tracking-wider"
            >
              GitHub
            </a>
          </div>

          <div className="font-sans text-base text-garden-textMuted space-y-1">
            <p>Sown with care in Bristol</p>
            <p>
              Weather data by{" "}
              <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="hover:text-garden-green transition-colors">
                Open-Meteo
              </a>
              {" "}&middot;{" "}
              Built with Next.js &middot; Hosted on Vercel
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
