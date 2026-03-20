"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";

interface PlantOption {
  id: string;
  commonName: string;
  variety: string;
}

export function LogForm() {
  const searchParams = useSearchParams();
  const preselectedPlant = searchParams.get("plant") ?? "";

  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [plantId, setPlantId] = useState(preselectedPlant);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string>("sowed");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/plants")
      .then((r) => r.json())
      .then(setPlants)
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!plantId || !imageUrl || !caption) {
      setError("Fill in all fields and upload a photo");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId,
          caption,
          status,
          cloudinaryUrl: imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to save log entry");

      setSuccess(true);
      setCaption("");
      setImageUrl("");
      setStatus("sowed");
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="font-sans font-bold text-3xl text-garden-text mb-4">
          Logged!
        </h2>
        <p className="font-sans text-garden-textMuted mb-6">
          Photo entry saved successfully.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setSuccess(false)}
            className="font-sans text-sm text-garden-textMuted border border-garden-border px-4 py-2 rounded hover:border-garden-greenBright hover:text-garden-text transition-colors min-h-[48px]"
          >
            Add Another
          </button>
          <a
            href="/"
            className="font-sans text-sm text-garden-textMuted border border-garden-border px-4 py-2 rounded hover:border-garden-greenBright hover:text-garden-text transition-colors min-h-[48px] inline-flex items-center"
          >
            View Garden
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-sans font-bold text-3xl text-garden-text mb-6">
        Add Photo Log
      </h2>

      <div className="space-y-6">
        {/* Plant selector */}
        <div>
          <label className="block mb-2 font-sans text-base text-garden-textMuted uppercase tracking-wider">
            Plant
          </label>
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="w-full bg-white border border-garden-border rounded px-3 py-2 text-garden-text font-sans text-sm focus:outline-none focus:border-garden-greenBright"
          >
            <option value="">Select a plant...</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.commonName} — {p.variety}
              </option>
            ))}
          </select>
        </div>

        {/* Photo upload */}
        <div>
          <label className="block mb-2 font-sans text-base text-garden-textMuted uppercase tracking-wider">
            Photo
          </label>
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Upload preview"
                className="w-full rounded border border-garden-border"
              />
              <button
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 bg-white text-garden-textMuted font-sans text-base px-2 py-1 rounded hover:bg-garden-greenLight transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <CldUploadWidget
              uploadPreset="garden_log"
              options={{
                maxFiles: 1,
                resourceType: "image",
                sources: ["local", "camera"],
              }}
              onSuccess={(result) => {
                if (
                  typeof result?.info === "object" &&
                  "secure_url" in result.info
                ) {
                  setImageUrl(result.info.secure_url as string);
                }
              }}
            >
              {({ open }) => (
                <button
                  onClick={() => open()}
                  className="w-full border-2 border-dashed border-garden-border rounded-lg py-8 text-center hover:border-garden-greenBright transition-colors group"
                >
                  <p className="font-sans text-sm text-garden-textMuted group-hover:text-garden-text transition-colors">
                    Click to upload a photo
                  </p>
                  <p className="font-sans text-base text-garden-textMuted mt-1">
                    JPG, PNG, HEIC
                  </p>
                </button>
              )}
            </CldUploadWidget>
          )}
        </div>

        {/* Caption */}
        <div>
          <label className="block mb-2 font-sans text-base text-garden-textMuted uppercase tracking-wider">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="w-full bg-white border border-garden-border rounded px-3 py-2 text-garden-text font-sans text-sm focus:outline-none focus:border-garden-greenBright resize-none"
            placeholder="What's happening with this plant?"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block mb-2 font-sans text-base text-garden-textMuted uppercase tracking-wider">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white border border-garden-border rounded px-3 py-2 text-garden-text font-sans text-sm focus:outline-none focus:border-garden-greenBright"
          >
            <option value="sowed">Sowed</option>
            <option value="germinated">Germinated</option>
            <option value="transplanted">Transplanted</option>
            <option value="flowering">Flowering</option>
            <option value="harvested">Harvested</option>
          </select>
        </div>

        {/* Submit */}
        {error && (
          <p className="font-sans text-base text-red-600">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-garden-greenBright hover:bg-garden-green disabled:bg-gray-300 disabled:text-gray-500 text-white font-sans text-sm py-3 rounded transition-colors min-h-[48px]"
        >
          {submitting ? "Saving..." : "Save Log Entry"}
        </button>
      </div>
    </div>
  );
}
