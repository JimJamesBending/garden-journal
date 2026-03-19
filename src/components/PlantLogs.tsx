"use client";

import { useState, useEffect } from "react";
import { LogEntry } from "@/lib/types";
import { PhotoTimeline } from "./PhotoTimeline";

export function PlantLogs({
  plantId,
  initialLogs,
}: {
  plantId: string;
  initialLogs: LogEntry[];
}) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);

  useEffect(() => {
    // Fetch latest logs from API on mount
    fetch("/api/logs")
      .then((r) => r.json())
      .then((allLogs: LogEntry[]) => {
        const plantLogs = allLogs
          .filter((l) => l.plantId === plantId)
          .sort(
            (a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        if (plantLogs.length > 0) {
          setLogs(plantLogs);
        }
      })
      .catch(() => {
        // Keep initial logs on error
      });
  }, [plantId]);

  return <PhotoTimeline logs={logs} />;
}
