"use client";

import { useState, useEffect } from "react";

interface GardenNavProps {
  hasSpaces: boolean;
  hasTimeline: boolean;
  hasTips: boolean;
}

interface NavItem {
  id: string;
  label: string;
}

export function GardenNav({ hasSpaces, hasTimeline, hasTips }: GardenNavProps) {
  const [activeSection, setActiveSection] = useState("plants");
  const [isSticky, setIsSticky] = useState(false);

  const items: NavItem[] = [
    { id: "plants", label: "Plants" },
    ...(hasSpaces ? [{ id: "spaces", label: "Spaces" }] : []),
    ...(hasTimeline ? [{ id: "timeline", label: "Timeline" }] : []),
    ...(hasTips ? [{ id: "tips", label: "Tips" }] : []),
  ];

  useEffect(() => {
    const ids = items.map((i) => i.id);

    const handleScroll = () => {
      // Show sticky nav after scrolling past hero (roughly 300px)
      setIsSticky(window.scrollY > 300);

      // Determine active section based on scroll position
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSpaces, hasTimeline, hasTips]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-garden-border transition-all duration-300 ${
        isSticky ? "shadow-sm" : "shadow-none"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`font-sans text-body-sm px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                activeSection === item.id
                  ? "bg-garden-green text-white font-medium"
                  : "text-garden-textMuted hover:text-garden-text hover:bg-garden-offwhite"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
