"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AdviceEntry } from "@/lib/types";

interface AIGardenerPreviewProps {
  advice: AdviceEntry[];
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: "border-red-300 bg-red-50",
    high: "border-amber-300 bg-amber-50",
    medium: "border-garden-border bg-garden-greenLight",
    low: "border-garden-border bg-white",
    info: "border-garden-border bg-white",
  };
  return colors[priority] || "border-garden-border bg-white";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "this-week": "\u{2705}",
    "coming-up": "\u{1F4C5}",
    seasonal: "\u{1F33B}",
    "weather-alert": "\u{26A0}\u{FE0F}",
    "growth-update": "\u{1F4CA}",
    problem: "\u{1F41B}",
    harvest: "\u{1F33E}",
    "buy-list": "\u{1F6D2}",
    "fun-fact": "\u{1F4A1}",
  };
  return icons[category] || "\u{1F33F}";
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "this-week": "This Week",
    "coming-up": "Coming Up",
    seasonal: "Seasonal",
    "weather-alert": "Weather Alert",
    "growth-update": "Growth Update",
    problem: "Needs Attention",
    harvest: "Harvest",
    "buy-list": "Shopping List",
    "fun-fact": "Did You Know?",
  };
  return labels[category] || category;
}

export function AIGardenerPreview({ advice }: AIGardenerPreviewProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Show top 6 most interesting advice items for the public page
  const topAdvice = advice
    .filter((a) => !a.dismissed)
    .slice(0, 6);

  if (topAdvice.length === 0) return null;

  return (
    <section ref={ref} className="py-24 px-6 bg-garden-greenLight">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-sans text-base text-garden-textMuted uppercase tracking-[0.3em]">
            Garden Tips
          </span>
          <h2 className="font-sans font-bold text-5xl md:text-6xl text-garden-text mt-3 mb-4">
            The Gardener Says&hellip;
          </h2>
          <p className="font-sans text-garden-textMuted max-w-lg mx-auto">
            Personalised advice based on your plants, the weather, and the
            season. Like having a knowledgeable gardener friend who never forgets.
          </p>
        </motion.div>

        {/* Advice cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topAdvice.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.1 * i,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`rounded-2xl border p-6 ${getPriorityColor(
                item.priority
              )} hover:border-garden-greenBright transition-colors`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl flex-shrink-0">
                  {getCategoryIcon(item.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans text-base text-garden-textMuted uppercase tracking-wider">
                      {getCategoryLabel(item.category)}
                    </span>
                    {item.actionRequired && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  <h3 className="font-sans font-bold text-lg text-garden-text">
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <p className="font-sans text-sm text-garden-textMuted leading-relaxed whitespace-pre-line">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA to portal */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <a
            href="/garden"
            className="inline-flex items-center gap-2 font-sans text-base uppercase tracking-wider text-garden-green hover:text-garden-greenBright transition-colors border border-garden-greenBright hover:border-garden-green px-6 py-3 rounded-full min-h-[48px]"
          >
            Open My Garden
            <span className="text-sm">{"\u{2192}"}</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
