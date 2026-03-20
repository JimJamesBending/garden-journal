"use client";

import { useReducer, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Plant, LogEntry, Space, WizardPhoto } from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";
import { wizardReducer, initialWizardState } from "./wizard/wizardReducer";

interface PhotoWizardProps {
  plants: Plant[];
  logs: LogEntry[];
  spaces: Space[];
  onBack: () => void;
  onRefresh: () => void;
}

const STEPS = ["photo", "results", "done"] as const;

export function PhotoWizard({
  plants,
  onBack,
  onRefresh,
}: PhotoWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [manualName, setManualName] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- Upload photo to Cloudinary ---
  const handleAddPhoto = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;

      const newPhoto: WizardPhoto = {
        id: `wiz-${Date.now()}`,
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
      };

      dispatch({ type: "ADD_PHOTOS", photos: [newPhoto] });

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
          id: newPhoto.id,
          progress: 100,
          url: data.secure_url,
          thumbnailUrl: thumbnail(data.secure_url),
        });
      } catch {
        dispatch({
          type: "SET_ERROR",
          error: "Failed to upload photo. Please try again.",
        });
      }
    },
    []
  );

  // --- Identify plant via AI ---
  const handleIdentify = useCallback(async () => {
    dispatch({ type: "START_IDENTIFYING" });

    try {
      const photoUrls = state.photos
        .filter((p) => !p.uploading && p.cloudinaryUrl)
        .map((p) => p.cloudinaryUrl);

      const res = await fetch("/api/wizard/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrls }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Identification failed");
      }

      const sortResults = await res.json();
      dispatch({ type: "SET_SORT_RESULTS", results: sortResults });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Couldn't identify the plant. You can type the name instead.",
      });
      dispatch({ type: "GO_TO_STEP", step: "results" });
      setShowManualInput(true);
    }
  }, [state.photos]);

  // --- Save plant to garden ---
  const handleSave = useCallback(async (plantName: string) => {
    dispatch({ type: "CONFIRM_NAME", name: plantName });
    dispatch({ type: "PROCESS_START" });

    try {
      const photo = state.photos.find((p) => p.cloudinaryUrl);
      const today = new Date().toISOString().split("T")[0];
      const tempId = `__NEW_${Date.now()}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actions: { type: string; data: Record<string, any> }[] = [
        {
          type: "create-plant",
          data: {
            commonName: plantName,
            variety: "",
            latinName: photo?.plantIdResult?.species || "",
            category: photo?.category || "flower",
            sowDate: today,
            location: "outdoor",
            notes: state.identifiedCareTips || "",
            seedSource: "Photo wizard",
            tempId,
          },
        },
      ];

      if (photo?.cloudinaryUrl) {
        actions.push({
          type: "create-log",
          data: {
            cloudinaryUrl: photo.cloudinaryUrl,
            plantId: tempId,
            caption: `${plantName} — added via photo`,
            status: "sowed",
          },
        });
      }

      const res = await fetch("/api/wizard/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const result = await res.json();
      dispatch({ type: "PROCESS_COMPLETE", result });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to save. Please try again.",
      });
    }
  }, [state.photos, state.identifiedCareTips]);

  // --- Step indicator ---
  const currentStepIndex = STEPS.indexOf(state.step);
  const uploadedPhoto = state.photos.find((p) => !p.uploading && p.cloudinaryUrl);
  const isUploading = state.photos.some((p) => p.uploading);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-garden-border px-4 py-3 flex items-center justify-between bg-white">
        <button
          onClick={onBack}
          className="font-sans text-base text-garden-textMuted hover:text-garden-green transition-colors min-h-[48px] px-2"
        >
          {"\u2190"} Close
        </button>
        <h1 className="font-sans font-bold text-lg text-garden-text">Add a Photo</h1>
        <div className="w-16" />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-garden-border bg-white">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full transition-colors ${
                i <= currentStepIndex
                  ? "bg-garden-greenBright"
                  : "bg-garden-border"
              }`}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`w-10 h-0.5 mx-1 transition-colors ${
                  i < currentStepIndex
                    ? "bg-garden-greenBright"
                    : "bg-garden-border"
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
          className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-300 rounded-xl"
        >
          <p className="font-sans text-base text-red-700">{state.error}</p>
          <button
            onClick={() => dispatch({ type: "SET_ERROR", error: "" })}
            className="font-sans text-base text-garden-red mt-1 hover:text-red-700 min-h-[48px]"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* ========== STEP 1: PHOTO ========== */}
          {state.step === "photo" && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="font-sans text-lg text-garden-text font-semibold mb-1">
                  {"\uD83D\uDCF7"} Take a photo of your plant
                </p>
                <p className="font-sans text-base text-garden-textMuted">
                  We&rsquo;ll try to identify it for you
                </p>
              </div>

              {/* Photo preview */}
              {uploadedPhoto ? (
                <div className="relative mx-auto max-w-sm">
                  <img
                    src={uploadedPhoto.cloudinaryUrl}
                    alt="Your plant"
                    className="w-full rounded-2xl border border-garden-border shadow-sm"
                  />
                  <button
                    onClick={() => {
                      dispatch({ type: "REMOVE_PHOTO", id: uploadedPhoto.id });
                    }}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 border border-garden-border flex items-center justify-center text-garden-textMuted hover:text-garden-red transition-colors"
                  >
                    {"\u2715"}
                  </button>
                </div>
              ) : isUploading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-garden-greenBright border-t-garden-border rounded-full animate-spin mb-4" />
                  <p className="font-sans text-base text-garden-textMuted">Uploading...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera button */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-6 rounded-2xl border-2 border-dashed border-garden-greenBright bg-garden-greenLight hover:bg-garden-greenLight/80 transition-colors flex flex-col items-center gap-2 min-h-[120px]"
                  >
                    <span className="text-4xl">{"\uD83D\uDCF8"}</span>
                    <span className="font-sans text-lg text-garden-green font-semibold">
                      Take a Photo
                    </span>
                    <span className="font-sans text-sm text-garden-textMuted">
                      Use your camera
                    </span>
                  </button>

                  {/* Upload from library */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-2xl border border-garden-border bg-white hover:bg-garden-offwhite transition-colors flex items-center justify-center gap-2 min-h-[56px]"
                  >
                    <span className="text-xl">{"\uD83D\uDDBC\uFE0F"}</span>
                    <span className="font-sans text-base text-garden-text">
                      Choose from photos
                    </span>
                  </button>

                  {/* Seed packet tip */}
                  <div className="bg-garden-greenLight rounded-2xl px-4 py-3 mt-4">
                    <p className="font-sans text-sm text-garden-text">
                      {"\uD83D\uDCA1"} <strong>Tip:</strong> You can also photograph a seed packet — we&rsquo;ll read the label for you!
                    </p>
                  </div>
                </div>
              )}

              {/* Next button */}
              {uploadedPhoto && (
                <button
                  onClick={handleIdentify}
                  className="w-full py-4 rounded-2xl bg-garden-greenBright hover:bg-garden-green text-white font-sans text-lg font-semibold transition-colors min-h-[56px]"
                >
                  Identify This Plant {"\u2192"}
                </button>
              )}

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && handleAddPhoto(e.target.files)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleAddPhoto(e.target.files)}
              />
            </motion.div>
          )}

          {/* ========== STEP 2: RESULTS ========== */}
          {state.step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Photo thumbnail */}
              {uploadedPhoto && (
                <div className="mx-auto max-w-xs">
                  <img
                    src={uploadedPhoto.cloudinaryUrl}
                    alt="Your plant"
                    className="w-full h-48 rounded-2xl object-cover border border-garden-border"
                  />
                </div>
              )}

              {/* Loading state */}
              {state.identifying && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-3 border-garden-greenBright border-t-garden-border rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-sans text-lg text-garden-text font-semibold">
                    Looking at your photo...
                  </p>
                  <p className="font-sans text-base text-garden-textMuted mt-1">
                    Our garden helper is identifying your plant
                  </p>
                </div>
              )}

              {/* Saving state */}
              {state.processing && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-3 border-garden-greenBright border-t-garden-border rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-sans text-lg text-garden-text font-semibold">
                    Saving to your garden...
                  </p>
                </div>
              )}

              {/* Identified result */}
              {!state.identifying && !state.processing && state.identifiedName && !showManualInput && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <p className="font-sans text-base text-garden-textMuted mb-1">
                      We think this is a...
                    </p>
                    <p className="font-sans text-2xl font-bold text-garden-text">
                      {state.identifiedName}
                    </p>
                    {state.identifiedConfidence > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-garden-greenLight rounded-full overflow-hidden">
                          <div
                            className="h-full bg-garden-greenBright rounded-full"
                            style={{ width: `${Math.min(state.identifiedConfidence, 100)}%` }}
                          />
                        </div>
                        <span className="font-sans text-sm text-garden-textMuted">
                          {Math.round(state.identifiedConfidence)}% sure
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Care tips */}
                  {state.identifiedCareTips && (
                    <div className="bg-garden-greenLight rounded-2xl px-4 py-3">
                      <p className="font-sans text-sm text-garden-text">
                        {"\uD83C\uDF3F"} {state.identifiedCareTips}
                      </p>
                    </div>
                  )}

                  {/* Confirm / Correct */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleSave(state.identifiedName!)}
                      className="w-full py-4 rounded-2xl bg-garden-greenBright hover:bg-garden-green text-white font-sans text-lg font-semibold transition-colors min-h-[56px]"
                    >
                      {"\u2705"} Yes, that&rsquo;s right — save it!
                    </button>
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="w-full py-4 rounded-2xl border border-garden-border bg-white hover:bg-garden-offwhite font-sans text-base text-garden-text transition-colors min-h-[56px]"
                    >
                      {"\u274C"} No, let me type the name
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Not identified / manual input */}
              {!state.identifying && !state.processing && (showManualInput || !state.identifiedName) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <p className="font-sans text-lg text-garden-text font-semibold">
                      {state.identifiedName ? "What\u2019s it called?" : "We couldn\u2019t quite tell"}
                    </p>
                    <p className="font-sans text-base text-garden-textMuted mt-1">
                      Type the plant name below
                    </p>
                  </div>

                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Tomato, Sunflower, Basil..."
                    autoFocus
                    className="w-full px-4 py-4 rounded-2xl border border-garden-border bg-white font-sans text-lg text-garden-text placeholder:text-garden-border focus:outline-none focus:border-garden-greenBright focus:ring-2 focus:ring-garden-greenBright/20 min-h-[56px]"
                  />

                  {/* Quick suggestions from existing plants */}
                  {plants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {plants
                        .slice(0, 8)
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setManualName(p.commonName)}
                            className="px-3 py-2 rounded-full border border-garden-border bg-white hover:bg-garden-greenLight font-sans text-sm text-garden-text transition-colors min-h-[40px]"
                          >
                            {p.commonName}
                          </button>
                        ))}
                    </div>
                  )}

                  <button
                    onClick={() => manualName.trim() && handleSave(manualName.trim())}
                    disabled={!manualName.trim()}
                    className="w-full py-4 rounded-2xl bg-garden-greenBright hover:bg-garden-green text-white font-sans text-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[56px]"
                  >
                    Save to My Garden
                  </button>

                  {state.identifiedName && (
                    <button
                      onClick={() => setShowManualInput(false)}
                      className="w-full py-2 font-sans text-base text-garden-textMuted hover:text-garden-text transition-colors"
                    >
                      {"\u2190"} Go back to suggestion
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ========== STEP 3: DONE ========== */}
          {state.step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
                className="text-6xl"
              >
                {"\uD83C\uDF89"}
              </motion.div>

              <div>
                <p className="font-sans text-2xl font-bold text-garden-text mb-2">
                  Saved!
                </p>
                <p className="font-sans text-lg text-garden-textMuted">
                  <strong>{state.savedPlantName}</strong> has been added to your garden.
                </p>
              </div>

              {/* Photo preview */}
              {uploadedPhoto && (
                <div className="mx-auto max-w-[200px]">
                  <img
                    src={uploadedPhoto.cloudinaryUrl}
                    alt={state.savedPlantName || "Plant"}
                    className="w-full rounded-2xl border border-garden-border shadow-sm"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  onRefresh();
                  onBack();
                }}
                className="w-full py-4 rounded-2xl bg-garden-greenBright hover:bg-garden-green text-white font-sans text-lg font-semibold transition-colors min-h-[56px]"
              >
                Back to My Garden
              </button>

              <button
                onClick={() => {
                  onRefresh();
                  dispatch({ type: "RESET" });
                  setManualName("");
                  setShowManualInput(false);
                }}
                className="w-full py-3 font-sans text-base text-garden-green hover:text-garden-greenBright transition-colors"
              >
                Add Another Plant
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
