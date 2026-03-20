"use client";

import { motion } from "framer-motion";
import { HazelMascot } from "@/components/HazelMascot";
import { thumbnail } from "@/lib/cloudinary";
import type { WizardAction, WizardPhoto } from "@/lib/types";

interface ReviewStepProps {
  actions: WizardAction[];
  photos: WizardPhoto[];
  onConfirm: () => void;
  onUndo: () => void;
  onRemoveAction: (index: number) => void;
}

export function ReviewStep({ actions, photos, onConfirm, onUndo, onRemoveAction }: ReviewStepProps) {
  // Group actions by plantName
  const grouped = actions.reduce<Record<string, { actions: WizardAction[]; indices: number[] }>>((acc, action, idx) => {
    const key = action.plantName || "General";
    if (!acc[key]) acc[key] = { actions: [], indices: [] };
    acc[key].actions.push(action);
    acc[key].indices.push(idx);
    return acc;
  }, {});

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Hazel celebrating */}
      <HazelMascot
        mood="celebrating"
        message={`All done! I\u2019ve made ${actions.length} change${actions.length !== 1 ? "s" : ""} to your garden journal.`}
        size="md"
      />

      {/* Grouped results */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([plantName, group], gi) => {
          // Find photos for this plant
          const logActions = group.actions.filter((a) => a.type === "create-log");
          const photoUrls = logActions
            .map((a) => a.data.cloudinaryUrl as string)
            .filter(Boolean);

          return (
            <motion.div
              key={plantName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.1 }}
              className="bg-moss-800/30 border border-moss-700/30 rounded-xl p-4 space-y-3"
            >
              {/* Plant name */}
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-parchment-200">
                  {plantName}
                  {group.actions.some((a) => a.type === "create-plant") && (
                    <span className="ml-2 font-mono text-[9px] text-moss-400 bg-moss-700/40 px-1.5 py-0.5 rounded-full uppercase">
                      new!
                    </span>
                  )}
                </h3>
              </div>

              {/* Photo thumbnails */}
              {photoUrls.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {photoUrls.map((url, i) => (
                    <img
                      key={i}
                      src={thumbnail(url)}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-moss-700/20"
                    />
                  ))}
                </div>
              )}

              {/* Action list */}
              <div className="space-y-1.5">
                {group.actions.map((action, ai) => (
                  <div
                    key={ai}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="font-mono text-[11px] text-moss-400 flex-1">
                      {action.description}
                    </span>
                    <button
                      onClick={() => onRemoveAction(group.indices[ai])}
                      className="ml-2 text-red-400/60 hover:text-red-400 text-xs transition-colors flex-shrink-0 p-1"
                      title="Remove"
                    >
                      {"\u2715"}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Confirm / Undo */}
      <div className="flex flex-col gap-3 pt-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onConfirm}
          className="w-full bg-moss-600 hover:bg-moss-500 text-parchment-200 font-display text-lg py-4 rounded-xl
                     shadow-lg transition-colors"
        >
          Looks Good! {"\u{1F44D}"}
        </motion.button>

        <button
          onClick={onUndo}
          className="mx-auto font-mono text-[11px] text-red-400/60 hover:text-red-400 transition-colors py-2"
        >
          Undo Everything
        </button>
      </div>
    </div>
  );
}
