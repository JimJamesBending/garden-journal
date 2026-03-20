"use client";

import { useReducer, useCallback } from "react";
import { motion } from "framer-motion";
import type { Plant, LogEntry, Space, WizardPhoto } from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";
import { wizardReducer, initialWizardState } from "./wizard/wizardReducer";
import { CaptureStep } from "./wizard/CaptureStep";
import { SortStep } from "./wizard/SortStep";
import { QuestionsStep } from "./wizard/QuestionsStep";
import { WorkingStep } from "./wizard/WorkingStep";
import { ReviewStep } from "./wizard/ReviewStep";
import { generateQuestions } from "./wizard/generateQuestions";
import { computeActions } from "./wizard/computeActions";

interface PhotoWizardProps {
  plants: Plant[];
  logs: LogEntry[];
  spaces: Space[];
  password: string;
  onBack: () => void;
  onRefresh: () => void;
}

const STEP_LABELS = {
  capture: "Take Photos",
  sort: "AI Sort",
  questions: "Questions",
  working: "Working",
  review: "Review",
};

const STEPS = ["capture", "sort", "questions", "working", "review"] as const;

export function PhotoWizard({
  plants,
  logs,
  spaces,
  password,
  onBack,
  onRefresh,
}: PhotoWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);

  // --- Upload photos to Cloudinary ---
  const handleAddPhotos = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      const remaining = 20 - state.photos.length;
      const toUpload = fileArray.slice(0, remaining);

      // Create placeholder photos
      const newPhotos: WizardPhoto[] = toUpload.map((_, i) => ({
        id: `wiz-${Date.now()}-${i}`,
        cloudinaryUrl: "",
        thumbnailUrl: "",
        uploadProgress: 0,
        uploading: true,
        category: null,
        categoryConfidence: 0,
        userOverrideCategory: null,
        ocrText: null,
        plantIdResult: null,
        aiNotes: null,
      }));

      dispatch({ type: "ADD_PHOTOS", photos: newPhotos });

      // Upload each in parallel
      await Promise.all(
        toUpload.map(async (file, i) => {
          const photo = newPhotos[i];
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "garden_log");

            const res = await fetch(
              "https://api.cloudinary.com/v1_1/davterbwx/image/upload",
              { method: "POST", body: formData }
            );
            const data = await res.json();

            dispatch({
              type: "UPDATE_UPLOAD",
              id: photo.id,
              progress: 100,
              url: data.secure_url,
              thumbnailUrl: thumbnail(data.secure_url),
            });
          } catch {
            dispatch({
              type: "SET_ERROR",
              error: `Failed to upload photo ${i + 1}`,
            });
          }
        })
      );
    },
    [state.photos.length]
  );

  // --- AI Sort ---
  const handleSort = useCallback(async () => {
    dispatch({ type: "GO_TO_STEP", step: "sort" });

    try {
      const photoUrls = state.photos
        .filter((p) => !p.uploading && p.cloudinaryUrl)
        .map((p) => p.cloudinaryUrl);

      const res = await fetch("/api/wizard/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrls, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sort failed");
      }

      const sortResults = await res.json();
      dispatch({ type: "SET_SORT_RESULTS", results: sortResults });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to sort photos",
      });
    }
  }, [state.photos, password]);

  // --- Generate questions from sort results ---
  const handleSortConfirm = useCallback(() => {
    const existingLogs = logs
      .filter((l) => l.labeled && l.cloudinaryUrl)
      .map((l) => ({ plantId: l.plantId, cloudinaryUrl: l.cloudinaryUrl }));

    const questions = generateQuestions(state.photos, plants, spaces, existingLogs);
    dispatch({ type: "SET_QUESTIONS", questions });
  }, [state.photos, plants, spaces, logs]);

  // --- Process all actions ---
  const handleProcess = useCallback(async () => {
    // Compute actions from answers
    const actions = computeActions(
      state.photos,
      state.questions,
      state.answers,
      plants
    );
    dispatch({ type: "SET_ACTIONS", actions });
    dispatch({ type: "PROCESS_START" });

    try {
      dispatch({ type: "PROCESS_UPDATE", message: "Creating plants and logs..." });

      const res = await fetch("/api/wizard/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      const result = await res.json();
      dispatch({ type: "PROCESS_UPDATE", message: "Nearly done..." });

      // Small delay for animation
      await new Promise((r) => setTimeout(r, 800));

      dispatch({ type: "PROCESS_COMPLETE", result });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to process",
      });
    }
  }, [state.photos, state.questions, state.answers, plants, password]);

  // --- When questions are all answered, trigger processing ---
  const handleAnswer = useCallback(
    (questionId: string, answer: string) => {
      dispatch({ type: "ANSWER_QUESTION", questionId, answer });

      // Check if this was the last question
      if (state.currentQuestionIndex >= state.questions.length - 1) {
        // All done — advance to processing after a brief delay
        setTimeout(() => handleProcess(), 300);
      }
    },
    [state.currentQuestionIndex, state.questions.length, handleProcess]
  );

  const handleSkip = useCallback(
    (questionId: string) => {
      dispatch({ type: "SKIP_QUESTION", questionId });

      if (state.currentQuestionIndex >= state.questions.length - 1) {
        setTimeout(() => handleProcess(), 300);
      }
    },
    [state.currentQuestionIndex, state.questions.length, handleProcess]
  );

  // --- Confirm review ---
  const handleConfirm = useCallback(() => {
    onRefresh();
    onBack();
  }, [onRefresh, onBack]);

  // --- Undo ---
  const handleUndo = useCallback(async () => {
    // TODO: Delete created records via their IDs
    // For now, just go back to capture
    dispatch({ type: "RESET" });
  }, []);

  // --- Step indicator ---
  const currentStepIndex = STEPS.indexOf(state.step);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-moss-800/50 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="font-mono text-sm text-moss-400 hover:text-parchment-300 transition-colors"
        >
          {"\u2190"} Close
        </button>
        <h1 className="font-display text-lg text-parchment-200">Photo Wizard</h1>
        <div className="w-14" /> {/* Spacer for centering */}
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1 px-4 py-2 border-b border-moss-800/30">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= currentStepIndex
                  ? "bg-parchment-400"
                  : "bg-moss-800/60"
              }`}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`w-6 h-px mx-0.5 transition-colors ${
                  i < currentStepIndex
                    ? "bg-parchment-400/50"
                    : "bg-moss-800/40"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 px-4 py-3 bg-red-900/30 border border-red-700/30 rounded-xl"
        >
          <p className="font-mono text-sm text-red-300">{state.error}</p>
          <button
            onClick={() => dispatch({ type: "SET_ERROR", error: "" })}
            className="font-mono text-[10px] text-red-400 mt-1 hover:text-red-300"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {state.step === "capture" && (
          <CaptureStep
            photos={state.photos}
            onAddPhotos={handleAddPhotos}
            onRemovePhoto={(id) => dispatch({ type: "REMOVE_PHOTO", id })}
            onDone={handleSort}
          />
        )}

        {state.step === "sort" && (
          <SortStep
            photos={state.photos}
            loading={state.photos.some((p) => p.category === null && !state.error)}
            onOverrideCategory={(photoId, category) =>
              dispatch({ type: "OVERRIDE_CATEGORY", photoId, category })
            }
            onConfirm={handleSortConfirm}
            onBack={() => dispatch({ type: "GO_TO_STEP", step: "capture" })}
          />
        )}

        {state.step === "questions" && (
          <QuestionsStep
            questions={state.questions}
            currentIndex={state.currentQuestionIndex}
            photos={state.photos}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            onBack={() => dispatch({ type: "GO_TO_STEP", step: "sort" })}
          />
        )}

        {state.step === "working" && (
          <WorkingStep
            message={state.processingMessage}
            actions={state.actions.filter((a) => a.type === "create-plant" || a.type === "create-log")}
            processing={state.processing}
          />
        )}

        {state.step === "review" && (
          <ReviewStep
            actions={state.actions}
            photos={state.photos}
            onConfirm={handleConfirm}
            onUndo={handleUndo}
            onRemoveAction={(index) => dispatch({ type: "REMOVE_ACTION", index })}
          />
        )}
      </div>
    </div>
  );
}
