interface HealthIndicatorProps {
  label: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  detail?: string;
}

const STATUS_COLORS = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
  unknown: "bg-gray-500",
};

const STATUS_LABELS = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

export function HealthIndicator({ label, status, detail }: HealthIndicatorProps) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]} shrink-0`} />
      <div className="min-w-0">
        <p className="text-base font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">
          {detail || STATUS_LABELS[status]}
        </p>
      </div>
    </div>
  );
}
