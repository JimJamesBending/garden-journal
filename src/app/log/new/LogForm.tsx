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
        <h2 className="font-display text-3xl text-parchment-200 mb-4">
          Logged!
        </h2>
        <p className="font-body text-parchment-500 mb-6">
          Photo entry saved successfully.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setSuccess(false)}
            className="font-mono text-sm text-moss-400 border border-moss-700/50 px-4 py-2 rounded hover:border-moss-500 hover:text-parchment-400 transition-colors"
          >
            Add Another
          </button>
          <a
            href="/"
            className="font-mono text-sm text-moss-400 border border-moss-700/50 px-4 py-2 rounded hover:border-moss-500 hover:text-parchment-400 transition-colors"
          >
            View Garden
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-display text-3xl text-parchment-200 mb-6">
        Add Photo Log
      </h2>

      <div className="space-y-6">
        {/* Plant selector */}
        <div>
          <label className="block mb-2 font-mono text-xs text-moss-500 uppercase tracking-wider">
            Plant
          </label>
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="w-full bg-night-950/80 border border-moss-800/50 rounded px-3 py-2 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
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
          <label className="block mb-2 font-mono text-xs text-moss-500 uppercase tracking-wider">
            Photo
          </label>
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Upload preview"
                className="w-full rounded border border-moss-800/30"
              />
              <button
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 bg-night-900/80 text-parchment-400 font-mono text-xs px-2 py-1 rounded hover:bg-night-800 transition-colors"
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
                  className="w-full border-2 border-dashed border-moss-800/50 rounded-lg py-8 text-center hover:border-moss-600/60 transition-colors group"
                >
                  <p className="font-mono text-sm text-moss-500 group-hover:text-parchment-400 transition-colors">
                    Click to upload a photo
                  </p>
                  <p className="font-mono text-xs text-moss-700 mt-1">
                    JPG, PNG, HEIC
                  </p>
                </button>
              )}
            </CldUploadWidget>
          )}
        </div>

        {/* Caption */}
        <div>
          <label className="block mb-2 font-mono text-xs text-moss-500 uppercase tracking-wider">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="w-full bg-night-950/80 border border-moss-800/50 rounded px-3 py-2 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600 resize-none"
            placeholder="What's happening with this plant?"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block mb-2 font-mono text-xs text-moss-500 uppercase tracking-wider">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-night-950/80 border border-moss-800/50 rounded px-3 py-2 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
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
          <p className="font-mono text-xs text-red-400">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-moss-700 hover:bg-moss-600 disabled:bg-moss-800 disabled:text-moss-600 text-parchment-200 font-mono text-sm py-3 rounded transition-colors"
        >
          {submitting ? "Saving..." : "Save Log Entry"}
        </button>
      </div>
    </div>
  );
}
