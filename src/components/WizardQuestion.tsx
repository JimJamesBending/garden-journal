"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WizardQuestion as WizardQuestionType } from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";

interface WizardQuestionProps {
  question: WizardQuestionType;
  photoUrls?: string[];
  totalQuestions: number;
  currentIndex: number;
  onAnswer: (optionId: string) => void;
  onSkip: () => void;
}

export function WizardQuestion({
  question,
  photoUrls,
  totalQuestions,
  currentIndex,
  onAnswer,
  onSkip,
}: WizardQuestionProps) {
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      onAnswer(`other:${otherText.trim()}`);
      setShowOther(false);
      setOtherText("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-moss-800/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-parchment-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="font-mono text-[10px] text-moss-500 whitespace-nowrap">
          {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Photo thumbnails */}
      {photoUrls && photoUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photoUrls.map((url, i) => (
            <img
              key={i}
              src={thumbnail(url)}
              alt=""
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-moss-700/30"
            />
          ))}
        </div>
      )}

      {/* Question text */}
      <div className="bg-moss-800/50 border border-moss-700/30 rounded-2xl rounded-tl-sm py-3 px-4">
        <p className="font-body text-base text-parchment-300 leading-relaxed">
          {question.questionText}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, i) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onAnswer(option.id)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-moss-700/30 bg-moss-800/30
                       hover:bg-moss-700/40 hover:border-moss-600/40 active:scale-[0.97] transition-all text-left
                       min-h-[56px]"
          >
            {option.thumbnailUrl && (
              <img
                src={option.thumbnailUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
            )}
            {option.icon && !option.thumbnailUrl && (
              <span className="text-xl flex-shrink-0">{option.icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-body text-base text-parchment-200 block">
                {option.label}
              </span>
              {option.sublabel && (
                <span className="font-mono text-[10px] text-moss-400 block mt-0.5">
                  {option.sublabel}
                </span>
              )}
            </div>
          </motion.button>
        ))}

        {/* Other option */}
        <AnimatePresence>
          {!showOther ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowOther(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-moss-700/30 bg-moss-900/20
                         hover:bg-moss-800/30 hover:border-moss-600/40 active:scale-[0.97] transition-all text-left
                         min-h-[56px]"
            >
              <span className="text-xl flex-shrink-0">{"\u270F\uFE0F"}</span>
              <span className="font-body text-base text-moss-400">Other...</span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOtherSubmit()}
                  placeholder="Type your answer..."
                  autoFocus
                  className="flex-1 bg-night-950/80 border border-moss-700/50 rounded-xl px-4 py-3 text-parchment-300 font-body text-base
                             focus:outline-none focus:border-moss-500 min-h-[56px]"
                />
                <button
                  onClick={handleOtherSubmit}
                  disabled={!otherText.trim()}
                  className="px-4 bg-moss-700 hover:bg-moss-600 text-parchment-200 rounded-xl font-mono text-sm
                             disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  OK
                </button>
              </div>
              <button
                onClick={() => { setShowOther(false); setOtherText(""); }}
                className="mt-2 font-mono text-[11px] text-moss-500 hover:text-moss-400"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip */}
      {!question.required && (
        <button
          onClick={onSkip}
          className="block mx-auto font-mono text-[11px] text-moss-500 hover:text-moss-400 transition-colors py-2"
        >
          Skip this question
        </button>
      )}
    </motion.div>
  );
}
