"use client";

import { motion } from "framer-motion";
import { HazelMascot } from "@/components/HazelMascot";
import { thumbnail } from "@/lib/cloudinary";
import type { WizardPhoto, PhotoCategory } from "@/lib/types";

interface SortStepProps {
  photos: WizardPhoto[];
  loading: boolean;
  onOverrideCategory: (photoId: string, category: PhotoCategory) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const CATEGORY_BADGES: Record<PhotoCategory, { label: string; icon: string; color: string }> = {
  plant: { label: "Plant", icon: "\u{1F331}", color: "bg-garden-greenLight text-garden-green border-garden-border" },
  label: { label: "Label", icon: "\u{1F3F7}\uFE0F", color: "bg-amber-50 text-garden-amber border-amber-200" },
  overview: { label: "Overview", icon: "\u{1F3DE}\uFE0F", color: "bg-blue-50 text-garden-blue border-blue-200" },
  soil: { label: "Soil", icon: "\u{1F7EB}", color: "bg-orange-50 text-orange-800 border-orange-200" },
  unclear: { label: "Unclear", icon: "\u2753", color: "bg-gray-100 text-garden-textMuted border-gray-300" },
};

const CATEGORY_ORDER: PhotoCategory[] = ["plant", "label", "overview", "soil", "unclear"];

function nextCategory(current: PhotoCategory): PhotoCategory {
  const idx = CATEGORY_ORDER.indexOf(current);
  return CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length];
}

export function SortStep({ photos, loading, onOverrideCategory, onConfirm, onBack }: SortStepProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <HazelMascot
          mood="searching"
          message="Let me have a good look at your photos..."
          size="lg"
        />
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-48 h-1.5 bg-garden-greenLight rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-garden-greenBright rounded-full"
              animate={{ width: ["0%", "60%", "80%", "90%"] }}
              transition={{ duration: 8, ease: "easeOut" }}
            />
          </div>
          <p className="font-sans text-base text-garden-textMuted">Examining each photo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Hazel message */}
      <HazelMascot
        mood="asking"
        message={`I\u2019ve had a look at your ${photos.length} photo${photos.length !== 1 ? "s" : ""}. Tap any to change the category if I got it wrong!`}
        size="md"
      />

      {/* Photo grid */}
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, i) => {
          const effectiveCategory = photo.userOverrideCategory || photo.category || "unclear";
          const badge = CATEGORY_BADGES[effectiveCategory];

          return (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onOverrideCategory(photo.id, nextCategory(effectiveCategory))}
              className="relative rounded-xl overflow-hidden border border-garden-border hover:border-garden-greenBright
                         active:scale-95 transition-all text-left"
            >
              {/* Photo */}
              <div className="aspect-square">
                <img
                  src={photo.thumbnailUrl || thumbnail(photo.cloudinaryUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Category badge */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-white/90 to-transparent">
                <span className={`inline-flex items-center gap-1 text-base font-sans uppercase tracking-wider
                                  px-2 py-0.5 rounded-full border ${badge.color}`}>
                  <span>{badge.icon}</span>
                  {badge.label}
                </span>
              </div>

              {/* Confidence indicator (only show if low) */}
              {photo.categoryConfidence > 0 && photo.categoryConfidence < 80 && !photo.userOverrideCategory && (
                <div className="absolute top-2 right-2">
                  <span className="font-sans text-sm text-garden-textMuted bg-white/80 px-1.5 py-0.5 rounded-full">
                    {photo.categoryConfidence}%
                  </span>
                </div>
              )}

              {/* OCR text preview for labels */}
              {effectiveCategory === "label" && photo.ocrText && (
                <div className="absolute top-2 left-2 right-2">
                  <span className="font-sans text-sm text-garden-text bg-white/80 px-1.5 py-0.5 rounded line-clamp-2">
                    {photo.ocrText.slice(0, 60)}
                  </span>
                </div>
              )}

              {/* Override indicator */}
              {photo.userOverrideCategory && (
                <div className="absolute top-2 right-2">
                  <span className="font-sans text-sm text-white bg-garden-greenBright px-1.5 py-0.5 rounded-full">
                    edited
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Confirm button */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="font-sans text-sm text-garden-textMuted hover:text-garden-green transition-colors py-2 px-3"
        >
          {"\u2190"} Back
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onConfirm}
          className="bg-garden-greenBright hover:bg-garden-green text-white font-sans text-sm px-6 py-2.5 rounded-xl
                     shadow-lg transition-colors min-h-[48px]"
        >
          Looks Right!
        </motion.button>
      </div>
    </div>
  );
}
