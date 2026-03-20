"use client";

import { AnimatePresence } from "framer-motion";
import { HazelMascot } from "@/components/HazelMascot";
import { WizardQuestion } from "@/components/WizardQuestion";
import type { WizardQuestion as WizardQuestionType, WizardPhoto } from "@/lib/types";

interface QuestionsStepProps {
  questions: WizardQuestionType[];
  currentIndex: number;
  photos: WizardPhoto[];
  onAnswer: (questionId: string, answer: string) => void;
  onSkip: (questionId: string) => void;
  onBack: () => void;
}

export function QuestionsStep({
  questions,
  currentIndex,
  photos,
  onAnswer,
  onSkip,
  onBack,
}: QuestionsStepProps) {
  // All questions answered
  if (currentIndex >= questions.length) {
    return null; // Parent will handle advancing to next step
  }

  const currentQuestion = questions[currentIndex];

  // Get photo URLs for this question
  const questionPhotoUrls = currentQuestion.photoIds
    .map((id) => photos.find((p) => p.id === id)?.cloudinaryUrl)
    .filter(Boolean) as string[];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Hazel */}
      <HazelMascot
        mood="asking"
        message={
          currentIndex === 0
            ? "I\u2019ve got a few quick questions about your photos!"
            : currentIndex === questions.length - 1
            ? "Last one!"
            : "Nearly there..."
        }
        size="sm"
      />

      {/* Question */}
      <AnimatePresence mode="wait">
        <WizardQuestion
          key={currentQuestion.id}
          question={currentQuestion}
          photoUrls={questionPhotoUrls}
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          onAnswer={(answer) => onAnswer(currentQuestion.id, answer)}
          onSkip={() => onSkip(currentQuestion.id)}
        />
      </AnimatePresence>

      {/* Back button */}
      <button
        onClick={onBack}
        className="font-sans text-sm text-garden-textMuted hover:text-garden-green transition-colors py-2 px-3"
      >
        {"\u2190"} Back
      </button>
    </div>
  );
}
