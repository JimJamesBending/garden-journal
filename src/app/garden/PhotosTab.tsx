"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PlantOption {
  id: string;
  commonName: string;
  variety: string;
}

interface PendingPhoto {
  url: string;
  plantId: string;
  caption: string;
  status: string;
}

interface LogEntry {
  id: string;
  plantId: string;
  date: string;
  cloudinaryUrl: string;
  caption: string;
  status: string;
  labeled: boolean;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "davterbwx";

export function PhotosTab({ password }: { password: string }) {
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const [plantsRes, logsRes] = await Promise.all([
      fetch("/api/plants"),
      fetch("/api/logs"),
    ]);
    setPlants(await plantsRes.json());
    setRecentLogs(await logsRes.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage("");

    try {
      const uploads = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "garden_log");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.secure_url as string;
      });

      const urls = await Promise.all(uploads);

      setPendingPhotos((prev) => [
        ...prev,
        ...urls.map((url) => ({
          url,
          plantId: "",
          caption: "",
          status: "sowed",
        })),
      ]);

      setMessage(`Uploaded ${urls.length} photo(s)`);
    } catch {
      setMessage("Upload failed — try again");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updatePending = (
    index: number,
    field: keyof PendingPhoto,
    value: string
  ) => {
    setPendingPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const removePending = (index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    if (pendingPhotos.length === 0) return;

    setSaving(true);
    setMessage("");

    try {
      const entries = pendingPhotos.map((p) => ({
        cloudinaryUrl: p.url,
        plantId: p.plantId,
        caption: p.caption,
        status: p.status,
      }));

      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, password }),
      });

      if (!res.ok) throw new Error("Save failed");

      setMessage(`Saved ${pendingPhotos.length} photo(s)`);
      setPendingPhotos([]);
      loadData();
    } catch {
      setMessage("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const plantName = (id: string) => {
    const p = plants.find((pl) => pl.id === id);
    return p ? p.commonName : "Untagged";
  };

  return (
    <div>
      {/* Upload button */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-moss-700 hover:bg-moss-600 active:bg-moss-800 disabled:bg-moss-800 text-parchment-200 font-mono text-base py-5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <span className="text-2xl">{"\u{1F4F7}"}</span>
          {uploading ? "Uploading..." : "Upload Photos"}
        </button>
      </div>

      {/* Pending photos — tag before saving */}
      {pendingPhotos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-xs text-moss-400 uppercase tracking-wider">
              {pendingPhotos.length} photo(s) ready
            </h3>
            <button
              onClick={saveAll}
              disabled={saving}
              className="bg-moss-600 hover:bg-moss-500 disabled:bg-moss-800 text-parchment-200 font-mono text-xs px-4 py-2 rounded-lg transition-colors active:scale-95"
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>

          <div className="space-y-4">
            {pendingPhotos.map((photo, i) => (
              <div
                key={i}
                className="bg-night-900/50 border border-moss-800/30 rounded-lg overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={photo.url}
                    alt="Upload"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => removePending(i)}
                    className="absolute top-2 right-2 bg-night-900/80 text-parchment-400 w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm active:scale-90"
                  >
                    x
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {/* Plant picker */}
                  <select
                    value={photo.plantId}
                    onChange={(e) =>
                      updatePending(i, "plantId", e.target.value)
                    }
                    className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
                  >
                    <option value="">
                      Leave for Claude to identify...
                    </option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.commonName} — {p.variety}
                      </option>
                    ))}
                  </select>

                  {/* Caption */}
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) =>
                      updatePending(i, "caption", e.target.value)
                    }
                    placeholder="Caption (optional — Claude can fill this)"
                    className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
                  />

                  {/* Status */}
                  <select
                    value={photo.status}
                    onChange={(e) =>
                      updatePending(i, "status", e.target.value)
                    }
                    className="w-full bg-night-950/80 border border-moss-800/50 rounded-lg px-3 py-2 text-parchment-300 font-body text-sm focus:outline-none focus:border-moss-600"
                  >
                    <option value="sowed">Sowed</option>
                    <option value="germinated">Germinated</option>
                    <option value="transplanted">Transplanted</option>
                    <option value="flowering">Flowering</option>
                    <option value="harvested">Harvested</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <p className="font-mono text-xs text-moss-400 text-center mb-4">
          {message}
        </p>
      )}

      {/* Recent uploads gallery */}
      <div>
        <h3 className="font-mono text-xs text-moss-400 uppercase tracking-wider mb-3">
          All Photos ({recentLogs.length})
        </h3>

        {recentLogs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-moss-800/50 rounded-lg">
            <p className="font-mono text-sm text-moss-600">
              No photos yet — upload your first batch above
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img
                  src={log.cloudinaryUrl}
                  alt={log.caption || "Garden photo"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-night-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-1 left-1 right-1">
                    <p className="font-mono text-[10px] text-parchment-300 truncate">
                      {log.labeled
                        ? plantName(log.plantId)
                        : "Needs labeling"}
                    </p>
                  </div>
                </div>
                {!log.labeled && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-earth-500 rounded-full" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
