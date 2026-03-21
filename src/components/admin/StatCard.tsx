interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, detail, trend }: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
        ? "text-red-400"
        : "text-gray-500";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {detail && (
        <p className={`text-xs mt-1 ${trendColor}`}>{detail}</p>
      )}
    </div>
  );
}
