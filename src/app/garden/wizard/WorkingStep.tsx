"use client";

import { motion } from "framer-motion";
import { HazelMascot } from "@/components/HazelMascot";

interface WorkingStepProps {
  message: string;
  actions: Array<{ description: string }>;
  processing: boolean;
}

export function WorkingStep({ message, actions, processing }: WorkingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      {/* Hazel working */}
      <HazelMascot
        mood="working"
        message={message || "Organising your garden..."}
        size="lg"
      />

      {/* Progress */}
      <div className="mt-8 w-full max-w-xs space-y-4">
        {/* Animated bar */}
        {processing && (
          <div className="w-full h-1.5 bg-garden-greenLight rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-garden-greenBright rounded-full"
              animate={{ width: ["0%", "100%"] }}
              transition={{ duration: 3, ease: "easeInOut" }}
            />
          </div>
        )}

        {/* Action log */}
        <div className="space-y-2">
          {actions.map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3 }}
              className="flex items-center gap-2"
            >
              <span className="text-garden-greenBright text-sm">{"\u2713"}</span>
              <span className="font-sans text-base text-garden-textMuted">
                {action.description}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
