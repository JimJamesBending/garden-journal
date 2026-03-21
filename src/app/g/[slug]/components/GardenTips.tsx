"use client";

interface GardenTipsProps {
  monthlyTasks: Array<{ plantName: string; task: string }>;
  harvestPredictions: Array<{
    plantName: string;
    daysRemaining: number;
    estimatedDate: string;
  }>;
  season: string;
  seasonEmoji: string;
}

const SEASONAL_TIPS: Record<string, string> = {
  Spring:
    "Time to start sowing seeds indoors and preparing beds. Watch for late frosts.",
  Summer:
    "Keep on top of watering, especially containers. Deadhead flowers for more blooms.",
  Autumn:
    "Plant spring bulbs now. Collect seeds from your best performers.",
  Winter:
    "Plan next year's garden. Clean and oil tools. Order seed catalogues.",
};

export function GardenTips({
  monthlyTasks,
  harvestPredictions,
  season,
  seasonEmoji,
}: GardenTipsProps) {
  const sortedHarvests = [...harvestPredictions].sort(
    (a, b) => a.daysRemaining - b.daysRemaining
  );

  const visibleTasks = monthlyTasks.slice(0, 5);

  return (
    <section className="bg-garden-cream border-t border-garden-border px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <h2 className="text-heading-sm text-garden-text mb-6">
          {seasonEmoji} This {season} in Your Garden
        </h2>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Monthly Tasks card */}
          {visibleTasks.length > 0 && (
            <div className="bg-white rounded-xl border border-garden-border p-5 shadow-sm">
              <h3 className="text-body font-semibold text-garden-text mb-3">
                Monthly Tasks
              </h3>
              <ul className="space-y-2.5">
                {visibleTasks.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg
                      className="w-5 h-5 text-garden-greenBright flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-body-sm text-garden-textMuted">
                      <span className="font-semibold text-garden-text">
                        {item.plantName}
                      </span>{" "}
                      &mdash; {item.task}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Harvest Countdown card */}
          {sortedHarvests.length > 0 && (
            <div className="bg-white rounded-xl border border-garden-border p-5 shadow-sm">
              <h3 className="text-body font-semibold text-garden-text mb-3">
                Harvest Countdown
              </h3>
              <ul className="space-y-3">
                {sortedHarvests.map((item, i) => {
                  // Progress bar: closer to harvest = fuller bar
                  // Assume a max of 180 days for scale
                  const maxDays = 180;
                  const progress = Math.max(
                    0,
                    Math.min(100, ((maxDays - item.daysRemaining) / maxDays) * 100)
                  );

                  return (
                    <li key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body-sm font-semibold text-garden-text">
                          {item.plantName}
                        </span>
                        <span className="text-label text-garden-textMuted">
                          {item.daysRemaining} days
                        </span>
                      </div>
                      <div className="w-full h-2 bg-garden-greenLight rounded-full overflow-hidden">
                        <div
                          className="h-full bg-garden-greenBright rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-label text-garden-textMuted mt-0.5">
                        Est. {item.estimatedDate}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Seasonal tip card (always shown) */}
          <div className="bg-garden-greenLight rounded-xl border border-garden-border p-5 shadow-sm">
            <h3 className="text-body font-semibold text-garden-text mb-2">
              {seasonEmoji} {season} Tip
            </h3>
            <p className="text-body-sm text-garden-textMuted leading-relaxed">
              {SEASONAL_TIPS[season] || SEASONAL_TIPS.Spring}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
