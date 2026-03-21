"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { timelineImage } from "@/lib/cloudinary";

interface TimelineEvent {
  type: "photo" | "care" | "planted";
  date: string;
  plantName: string;
  description: string;
  photoUrl?: string;
}

interface GardenTimelineProps {
  events: TimelineEvent[];
}

const DOT_COLORS: Record<TimelineEvent["type"], string> = {
  planted: "bg-garden-greenBright",
  care: "bg-garden-blue",
  photo: "bg-amber-500",
};

function TypeIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "planted":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V6M12 6c-2-4-7-4-8-1s2 5 8 7M12 6c2-4 7-4 8-1s-2 5-8 7" />
        </svg>
      );
    case "care":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 1-1 0-1C7 21 3 16.5 3 12S7 3 12 3c5.5 0 9.5 4 9.5 9 0 3-2 4.5-3.5 4.5S15 15 15 13V8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "photo":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M7 5l1-2h8l1 2" />
        </svg>
      );
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${month}`;
}

const INITIAL_VISIBLE = 8;

export function GardenTimeline({ events }: GardenTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  if (events.length === 0) return null;

  const visibleEvents = showAll ? events : events.slice(0, INITIAL_VISIBLE);
  const hasMore = events.length > INITIAL_VISIBLE;

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const fadeInLeft = {
    hidden: { opacity: 0, x: -16 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  };

  return (
    <section className="bg-white border-t border-garden-border px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="mb-8">
          <h2 className="text-heading-sm text-garden-text">The Story So Far</h2>
          <p className="text-body-sm text-garden-textMuted mt-1">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
        </div>

        {/* Timeline */}
        <motion.div
          className="relative"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Vertical line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-garden-border" />

          {visibleEvents.map((event, i) => (
            <motion.div
              key={`${event.date}-${event.plantName}-${i}`}
              className="relative pl-10 pb-8 last:pb-0"
              variants={fadeInLeft}
            >
              {/* Dot */}
              <div
                className={`absolute left-1.5 top-1 w-3 h-3 rounded-full ring-2 ring-white ${DOT_COLORS[event.type]}`}
              />

              {/* Card */}
              <div className="bg-garden-offwhite rounded-xl border border-garden-border p-4">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-garden-textMuted">
                    <TypeIcon type={event.type} />
                  </span>
                  <span className="text-label text-garden-textMuted">
                    {formatDate(event.date)}
                  </span>
                </div>

                {/* Plant name */}
                <p className="text-body-sm font-semibold text-garden-text mb-1">
                  {event.plantName}
                </p>

                {/* Description */}
                <p className="text-body-sm text-garden-textMuted">
                  {event.description}
                </p>

                {/* Photo thumbnail */}
                {event.photoUrl && (
                  <img
                    src={timelineImage(event.photoUrl)}
                    alt={`${event.plantName} photo`}
                    className="mt-3 rounded-lg w-full max-w-sm"
                    loading="lazy"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Show more button */}
        {hasMore && !showAll && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-body-sm font-medium text-garden-greenBright hover:text-garden-green transition-colors"
            >
              Show {events.length - INITIAL_VISIBLE} more events
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
