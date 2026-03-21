interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, detail, trend }: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
        ? "text-red-600"
        : "text-gray-500";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-base text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {detail && (
        <p className={`text-sm mt-1 ${trendColor}`}>{detail}</p>
      )}
    </div>
  );
}
