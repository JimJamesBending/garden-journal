import { LogEntry } from "@/lib/types";
import { StatusPill } from "./StatusPill";

interface PhotoTimelineProps {
  logs: LogEntry[];
}

export function PhotoTimeline({ logs }: PhotoTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-garden-border rounded-lg">
        <p className="font-sans text-base text-garden-textMuted">
          No photos yet — add one with the + Log button
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {logs.map((log, i) => {
        const date = new Date(log.date);
        const formatted = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <div key={log.id} className="relative">
            {/* Timeline connector */}
            {i < logs.length - 1 && (
              <div className="absolute left-6 top-full w-px h-6 bg-garden-border" />
            )}

            <div className="flex gap-4">
              {/* Date column */}
              <div className="flex-shrink-0 w-12 pt-1 text-right">
                <p className="font-sans text-base text-garden-textMuted">{formatted}</p>
              </div>

              {/* Content */}
              <div className="flex-1 bg-garden-greenLight border border-garden-border rounded-lg overflow-hidden">
                {log.cloudinaryUrl && (
                  <img
                    src={log.cloudinaryUrl}
                    alt={log.caption}
                    className="w-full max-h-96 object-cover"
                  />
                )}
                <div className="p-4 flex items-start justify-between gap-3">
                  <p className="font-sans text-sm text-garden-text">
                    {log.caption}
                  </p>
                  <StatusPill status={log.status} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
