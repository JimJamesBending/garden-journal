import { getPlants, getLogs, getLatestLog } from "@/lib/data";
import { PlantCard } from "@/components/PlantCard";

export default function HomePage() {
  const plants = getPlants();
  const logs = getLogs();

  const totalPlants = plants.length;
  const totalPhotos = logs.length;
  const categories = [...new Set(plants.map((p) => p.category))];

  return (
    <div>
      {/* Hero */}
      <section className="mb-12 text-center">
        <h2 className="font-display text-5xl md:text-6xl font-light text-parchment-200 mb-3">
          What Grows in Bristol
        </h2>
        <p className="font-body text-lg text-parchment-500 mb-6 max-w-xl mx-auto">
          Tracking seedlings from sowing to harvest. Spring 2025.
        </p>

        {/* Stats bar */}
        <div className="flex justify-center gap-8 font-mono text-xs text-moss-500 uppercase tracking-widest">
          <span>
            <strong className="text-parchment-400 text-sm">
              {totalPlants}
            </strong>{" "}
            plants
          </span>
          <span>
            <strong className="text-parchment-400 text-sm">
              {totalPhotos}
            </strong>{" "}
            photos
          </span>
          <span>
            <strong className="text-parchment-400 text-sm">
              {categories.length}
            </strong>{" "}
            categories
          </span>
        </div>
      </section>

      {/* Filter tabs by category */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {["all", ...categories].map((cat) => (
            <span
              key={cat}
              className="font-mono text-xs text-moss-400 uppercase tracking-wider px-3 py-1 border border-moss-800/40 rounded-full hover:border-moss-600/60 hover:text-parchment-400 transition-colors cursor-default"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Plant grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plants.map((plant) => (
          <PlantCard
            key={plant.id}
            plant={plant}
            latestLog={getLatestLog(plant.id)}
          />
        ))}
      </section>
    </div>
  );
}
