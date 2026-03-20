"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HazelMascot } from "@/components/HazelMascot";
import { thumbnail } from "@/lib/cloudinary";
import type { WizardPhoto } from "@/lib/types";

interface CaptureStepProps {
  photos: WizardPhoto[];
  onAddPhotos: (files: FileList) => void;
  onRemovePhoto: (id: string) => void;
  onDone: () => void;
}

const MAX_PHOTOS = 20;

export function CaptureStep({ photos, onAddPhotos, onRemovePhoto, onDone }: CaptureStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadedCount = photos.filter((p) => !p.uploading).length;
  const uploadingCount = photos.filter((p) => p.uploading).length;
  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Hazel greeting */}
      <div className="px-4 pt-4 pb-2">
        <HazelMascot
          mood="looking"
          message={
            photos.length === 0
              ? "Tap the big button to take photos of your garden! Take as many as you like."
              : `Lovely! ${uploadedCount} photo${uploadedCount !== 1 ? "s" : ""} ready.${canAddMore ? " Add more or tap Done!" : " That\u2019s the maximum!"}`
          }
          size="md"
        />
      </div>

      {/* Big capture button */}
      <div className="flex-1 flex items-center justify-center px-8 py-6">
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          {/* Camera button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => cameraInputRef.current?.click()}
            disabled={!canAddMore}
            className="w-44 h-44 rounded-3xl bg-garden-greenBright hover:bg-garden-green text-white shadow-lg
                       flex flex-col items-center justify-center gap-2 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed active:bg-garden-green"
          >
            <span className="text-5xl">{"\u{1F4F7}"}</span>
            <span className="font-sans font-bold text-lg">Take Photo</span>
          </motion.button>

          {/* File picker button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAddMore}
            className="w-full max-w-[176px] py-3 rounded-xl border border-dashed border-garden-border bg-garden-greenLight
                       text-garden-textMuted hover:text-garden-text hover:border-garden-greenBright transition-colors
                       font-sans text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {"\u{1F4C1}"} Choose Files
          </motion.button>

          {!canAddMore && (
            <p className="font-sans text-base text-garden-textMuted text-center">
              Maximum {MAX_PHOTOS} photos per session
            </p>
          )}
        </div>
      </div>

      {/* Photo thumbnail strip */}
      <AnimatePresence>
        {photos.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="border-t border-garden-border bg-garden-offwhite px-4 py-3"
          >
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="relative flex-shrink-0 w-16 h-16"
                >
                  {photo.uploading ? (
                    <div className="w-full h-full rounded-lg bg-garden-greenLight flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-garden-border border-t-garden-greenBright rounded-full animate-spin" />
                    </div>
                  ) : (
                    <img
                      src={photo.thumbnailUrl || thumbnail(photo.cloudinaryUrl)}
                      alt=""
                      className="w-full h-full rounded-lg object-cover border border-garden-border"
                    />
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-garden-red text-white text-base
                               flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    {"\u2715"}
                  </button>
                </motion.div>
              ))}

              {/* Add more button in strip */}
              {canAddMore && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-shrink-0 w-16 h-16 rounded-lg border border-dashed border-garden-border bg-garden-greenLight
                             flex items-center justify-center text-garden-textMuted hover:text-garden-text hover:border-garden-greenBright"
                >
                  <span className="text-2xl">+</span>
                </button>
              )}
            </div>

            {/* Status + Done button */}
            <div className="flex items-center justify-between mt-3">
              <span className="font-sans text-base text-garden-textMuted">
                {uploadedCount} photo{uploadedCount !== 1 ? "s" : ""}
                {uploadingCount > 0 && `, ${uploadingCount} uploading...`}
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onDone}
                disabled={uploadedCount === 0 || uploadingCount > 0}
                className="bg-garden-greenBright hover:bg-garden-green text-white font-sans text-sm px-6 py-2.5 rounded-xl
                           shadow-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px]"
              >
                Done — Let Hazel Look!
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAddPhotos(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
