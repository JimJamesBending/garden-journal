import { PlantStatus } from "@/lib/types";

const statusConfig: Record<
  PlantStatus,
  { label: string; className: string }
> = {
  sowed: {
    label: "Sowed",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  germinated: {
    label: "Sprouted",
    className: "bg-garden-greenLight text-garden-green border-garden-border",
  },
  transplanted: {
    label: "Transplanted",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  flowering: {
    label: "Flowering",
    className: "bg-pink-100 text-pink-800 border-pink-200",
  },
  harvested: {
    label: "Harvested",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
};

export function StatusPill({ status }: { status: PlantStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-block font-sans text-base uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
