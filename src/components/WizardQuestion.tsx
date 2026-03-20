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
        <div className="flex-1 h-1.5 bg-garden-greenLight rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-garden-greenBright rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="font-sans text-base text-garden-textMuted whitespace-nowrap">
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
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-garden-border"
            />
          ))}
        </div>
      )}

      {/* Question text */}
      <div className="bg-garden-greenLight border border-garden-border rounded-2xl rounded-tl-sm py-3 px-4">
        <p className="font-sans text-base text-garden-text leading-relaxed">
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
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-garden-border bg-white
                       hover:bg-garden-greenLight hover:border-garden-greenBright active:scale-[0.97] transition-all text-left
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
              <span className="font-sans text-base text-garden-text block">
                {option.label}
              </span>
              {option.sublabel && (
                <span className="font-sans text-base text-garden-textMuted block mt-0.5">
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
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-garden-border bg-garden-offwhite
                         hover:bg-garden-greenLight hover:border-garden-greenBright active:scale-[0.97] transition-all text-left
                         min-h-[56px]"
            >
              <span className="text-xl flex-shrink-0">{"\u270F\uFE0F"}</span>
              <span className="font-sans text-base text-garden-textMuted">Other...</span>
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
                  className="flex-1 bg-white border border-garden-border rounded-xl px-4 py-3 text-garden-text font-sans text-base
                             focus:outline-none focus:border-garden-greenBright focus:ring-1 focus:ring-garden-greenBright min-h-[56px]"
                />
                <button
                  onClick={handleOtherSubmit}
                  disabled={!otherText.trim()}
                  className="px-4 bg-garden-greenBright hover:bg-garden-green text-white rounded-xl font-sans text-sm
                             disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all min-h-[48px]"
                >
                  OK
                </button>
              </div>
              <button
                onClick={() => { setShowOther(false); setOtherText(""); }}
                className="mt-2 font-sans text-base text-garden-textMuted hover:text-garden-text"
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
          className="block mx-auto font-sans text-base text-garden-textMuted hover:text-garden-text transition-colors py-2"
        >
          Skip this question
        </button>
      )}
    </motion.div>
  );
}
