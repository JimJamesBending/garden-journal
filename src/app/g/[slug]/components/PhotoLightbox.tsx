"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { galleryImage } from "@/lib/cloudinary";

interface PhotoLightboxProps {
  url: string;
  caption?: string;
  date?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function PhotoLightbox({
  url,
  caption,
  date,
  onClose,
  onPrev,
  onNext,
}: PhotoLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/90"
          onClick={onClose}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close lightbox"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        {/* Previous button */}
        {onPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Previous photo"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Next button */}
        {onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Next photo"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {/* Image + caption */}
        <motion.div
          className="relative z-[1] flex flex-col items-center max-w-[90vw] max-h-[90vh]"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <img
            src={galleryImage(url)}
            alt={caption || "Plant photo"}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />

          {(caption || date) && (
            <div className="mt-4 text-center">
              {caption && (
                <p className="text-white text-body font-sans">{caption}</p>
              )}
              {date && (
                <p className="text-white/60 text-body-sm font-sans mt-1">
                  {new Date(date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
