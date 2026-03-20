"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import glossary from "../../data/garden-glossary.json";

interface TooltipProps {
  /** The gardening term to look up (case-insensitive). */
  term: string;
  /** Optional override for the definition. If omitted, uses glossary. */
  definition?: string;
  /** The visible content (defaults to the term itself). */
  children?: ReactNode;
}

/**
 * Educational hover/tap tooltip for gardening terms.
 *
 * GOLDEN RULE: This is an educational gardening site.
 * Every technical term gets a hover tooltip explaining it
 * in plain language. A visitor who knows nothing about
 * gardening should leave knowing something.
 *
 * Usage:
 *   <Tooltip term="hardening off">hardening off</Tooltip>
 *   <Tooltip term="NPK" />
 *   <Tooltip term="bolting">when it bolts</Tooltip>
 */
export function Tooltip({ term, definition, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Look up term in glossary (case-insensitive)
  const glossaryDef =
    (glossary as Record<string, string>)[term.toLowerCase()] ??
    (glossary as Record<string, string>)[term] ??
    null;

  const text = definition || glossaryDef;

  // If no definition found, just render the children unstyled
  if (!text) {
    return <span>{children || term}</span>;
  }

  const show = () => {
    clearTimeout(timeoutRef.current);

    // Position check — if near top of viewport, show below
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition(rect.top < 120 ? "below" : "above");
    }

    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  };

  const toggle = () => {
    if (visible) {
      setVisible(false);
    } else {
      show();
    }
  };

  return (
    <span className="relative inline-block">
      {/* Trigger — dotted underline */}
      <span
        ref={triggerRef}
        className="border-b border-dotted border-garden-border cursor-help text-garden-text hover:border-garden-greenBright transition-colors"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-describedby={`tooltip-${term}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {children || term}
      </span>

      {/* Floating card */}
      {visible && (
        <span
          ref={tooltipRef}
          id={`tooltip-${term}`}
          role="tooltip"
          className={`absolute z-[100] w-64 sm:w-72 px-3.5 py-2.5 rounded-xl
            bg-white border border-garden-border shadow-xl
            backdrop-blur-md
            ${
              position === "above"
                ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
                : "top-full mt-2 left-1/2 -translate-x-1/2"
            }
            animate-in fade-in slide-in-from-bottom-1 duration-200
          `}
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={hide}
        >
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-white border-garden-border
              ${
                position === "above"
                  ? "bottom-[-5px] border-r border-b"
                  : "top-[-5px] border-l border-t"
              }
            `}
          />

          {/* Term header */}
          <span className="block font-sans text-base text-garden-textMuted uppercase tracking-wider mb-1">
            {term}
          </span>

          {/* Definition */}
          <span className="block font-sans text-sm text-garden-text leading-relaxed">
            {text}
          </span>

          {/* Leaf decoration */}
          <span className="absolute top-1.5 right-2.5 text-sm opacity-30">
            {"\u{1F33F}"}
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * Inline tooltip wrapper that auto-detects gardening terms
 * in a block of text and wraps them with <Tooltip>.
 *
 * Usage:
 *   <GardenText>Water after hardening off and before bolting occurs.</GardenText>
 */
export function GardenText({ children }: { children: string }) {
  const terms = Object.keys(glossary as Record<string, string>);

  // Sort longest-first to prevent partial matches
  const sortedTerms = terms.sort((a, b) => b.length - a.length);

  // Build regex matching any term (case-insensitive, whole words)
  const pattern = new RegExp(
    `\\b(${sortedTerms.map(escapeRegex).join("|")})\\b`,
    "gi"
  );

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const text = children;
  const regex = new RegExp(pattern);

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Matched term — wrap in Tooltip
    const matched = match[0];
    const termKey = terms.find(
      (t) => t.toLowerCase() === matched.toLowerCase()
    );
    parts.push(
      <Tooltip key={match.index} term={termKey || matched}>
        {matched}
      </Tooltip>
    );

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span>{parts}</span>;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
