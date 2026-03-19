import { PlantStatus } from "@/lib/types";

const statusConfig: Record<
  PlantStatus,
  { label: string; className: string }
> = {
  sowed: {
    label: "Sowed",
    className: "bg-earth-800/80 text-earth-300 border-earth-700/50",
  },
  germinated: {
    label: "Sprouted",
    className: "bg-moss-800/80 text-moss-300 border-moss-700/50",
  },
  transplanted: {
    label: "Transplanted",
    className: "bg-moss-700/80 text-moss-200 border-moss-600/50",
  },
  flowering: {
    label: "Flowering",
    className: "bg-parchment-800/80 text-parchment-300 border-parchment-700/50",
  },
  harvested: {
    label: "Harvested",
    className: "bg-parchment-700/80 text-parchment-200 border-parchment-600/50",
  },
};

export function StatusPill({ status }: { status: PlantStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-block font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
