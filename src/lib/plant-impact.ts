/**
 * Plant Ecological Impact Module
 *
 * Provides estimated ecological impact data for garden plants.
 * Data sourced from RHS Plants for Pollinators research, NASA Clean Air Study,
 * and published horticultural ecology studies. All figures are approximations
 * and should be presented with "~" prefix.
 *
 * Sources:
 * - RHS Plants for Pollinators (rhs.org.uk/science/research/plants-for-pollinators)
 * - NASA Clean Air Study (Wolverton et al., 1989)
 * - Couvillon 2015: "Busy Bees: Variation in Insect Flower-Visiting Rates"
 * - Springer: "Garden varieties: attractiveness to butterflies" (J Insect Conserv, 2015)
 * - Oregon State: Bumblebees and lavender field studies
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImpactStat {
  emoji: string;
  label: string;
  value: number;
  maxValue: number;
}

export interface PlantImpact {
  pollinatorScore: number;
  beesPerSeason: number;
  butterfliesPerSeason: number;
  oxygenMlPerHour: number;
  carbonGramsPerYear: number;
  wildlifeScore: number;
  impactGrade: string;
  gradeStars: number;
  primaryStats: [ImpactStat, ImpactStat];
}

// ---------------------------------------------------------------------------
// Internal: known plant data
// ---------------------------------------------------------------------------

interface PlantRecord {
  commonName: string;
  latinName: string;
  category: "flower" | "herb" | "vegetable" | "fruit";
  pollinatorScore: number;
  beesPerSeason: number;
  butterfliesPerSeason: number;
  oxygenMlPerHour: number;
  carbonGramsPerYear: number;
  wildlifeScore: number;
  daysToMature: number;
  isIndoor: boolean;
}

/**
 * Known plants lookup table — 35 common UK garden plants.
 *
 * Pollinator estimates are for a single established plant over a full
 * growing season (~May-Sep, ~150 days). Based on RHS FIT Count methodology
 * (10-minute observation windows extrapolated) and published field studies.
 *
 * Oxygen / carbon figures are for a healthy, mature specimen under normal
 * growing conditions. Indoor plants use lower-light photosynthesis rates.
 *
 * Bee visit estimates: based on RHS pollinator ratings, field counts, and
 * extrapolation from Couvillon 2015 visitation rate data. A lavender bush
 * can see 100+ bee visits/day in peak summer; across a ~120 day active
 * season with seasonal variation, ~3600 cumulative visits is reasonable.
 * Most plants are much lower.
 *
 * Butterfly estimates: based on Springer 2015 garden variety study (East
 * Sussex, 2659 visits across 11 plant varieties) and Butterfly Conservation
 * records. Buddleia recorded 28 species at the National Collection.
 */
const KNOWN_PLANTS: PlantRecord[] = [
  // ── Flowers ──────────────────────────────────────────────────────────
  {
    commonName: "Lavender",
    latinName: "Lavandula angustifolia",
    category: "flower",
    pollinatorScore: 5,
    beesPerSeason: 3600,
    butterfliesPerSeason: 180,
    oxygenMlPerHour: 8,
    carbonGramsPerYear: 400,
    wildlifeScore: 4,
    daysToMature: 365,
    isIndoor: false,
  },
  {
    commonName: "Sunflower",
    latinName: "Helianthus annuus",
    category: "flower",
    pollinatorScore: 5,
    beesPerSeason: 2800,
    butterfliesPerSeason: 120,
    oxygenMlPerHour: 12,
    carbonGramsPerYear: 480,
    wildlifeScore: 5,
    daysToMature: 80,
    isIndoor: false,
  },
  {
    commonName: "Rose",
    latinName: "Rosa",
    category: "flower",
    pollinatorScore: 3,
    beesPerSeason: 900,
    butterfliesPerSeason: 60,
    oxygenMlPerHour: 7,
    carbonGramsPerYear: 380,
    wildlifeScore: 4,
    daysToMature: 365,
    isIndoor: false,
  },
  {
    commonName: "Foxglove",
    latinName: "Digitalis purpurea",
    category: "flower",
    pollinatorScore: 5,
    beesPerSeason: 2400,
    butterfliesPerSeason: 40,
    oxygenMlPerHour: 9,
    carbonGramsPerYear: 350,
    wildlifeScore: 4,
    daysToMature: 365,
    isIndoor: false,
  },
  {
    commonName: "Buddleia",
    latinName: "Buddleja davidii",
    category: "flower",
    pollinatorScore: 5,
    beesPerSeason: 2200,
    butterfliesPerSeason: 800,
    oxygenMlPerHour: 14,
    carbonGramsPerYear: 650,
    wildlifeScore: 5,
    daysToMature: 365,
    isIndoor: false,
  },
  {
    commonName: "Daisy",
    latinName: "Bellis perennis",
    category: "flower",
    pollinatorScore: 3,
    beesPerSeason: 600,
    butterfliesPerSeason: 80,
    oxygenMlPerHour: 4,
    carbonGramsPerYear: 180,
    wildlifeScore: 3,
    daysToMature: 90,
    isIndoor: false,
  },
  {
    commonName: "Marigold",
    latinName: "Tagetes",
    category: "flower",
    pollinatorScore: 3,
    beesPerSeason: 700,
    butterfliesPerSeason: 90,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 200,
    wildlifeScore: 3,
    daysToMature: 60,
    isIndoor: false,
  },
  {
    commonName: "Dahlia",
    latinName: "Dahlia",
    category: "flower",
    pollinatorScore: 4,
    beesPerSeason: 1200,
    butterfliesPerSeason: 100,
    oxygenMlPerHour: 7,
    carbonGramsPerYear: 320,
    wildlifeScore: 3,
    daysToMature: 120,
    isIndoor: false,
  },
  {
    commonName: "Cosmos",
    latinName: "Cosmos bipinnatus",
    category: "flower",
    pollinatorScore: 4,
    beesPerSeason: 1400,
    butterfliesPerSeason: 200,
    oxygenMlPerHour: 6,
    carbonGramsPerYear: 250,
    wildlifeScore: 3,
    daysToMature: 75,
    isIndoor: false,
  },
  {
    commonName: "Zinnia",
    latinName: "Zinnia elegans",
    category: "flower",
    pollinatorScore: 4,
    beesPerSeason: 1100,
    butterfliesPerSeason: 250,
    oxygenMlPerHour: 6,
    carbonGramsPerYear: 230,
    wildlifeScore: 3,
    daysToMature: 70,
    isIndoor: false,
  },

  // ── Herbs ────────────────────────────────────────────────────────────
  {
    commonName: "Mint",
    latinName: "Mentha",
    category: "herb",
    pollinatorScore: 4,
    beesPerSeason: 1500,
    butterfliesPerSeason: 80,
    oxygenMlPerHour: 6,
    carbonGramsPerYear: 280,
    wildlifeScore: 3,
    daysToMature: 90,
    isIndoor: false,
  },
  {
    commonName: "Basil",
    latinName: "Ocimum basilicum",
    category: "herb",
    pollinatorScore: 3,
    beesPerSeason: 800,
    butterfliesPerSeason: 40,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 200,
    wildlifeScore: 2,
    daysToMature: 60,
    isIndoor: false,
  },
  {
    commonName: "Rosemary",
    latinName: "Salvia rosmarinus",
    category: "herb",
    pollinatorScore: 4,
    beesPerSeason: 1800,
    butterfliesPerSeason: 50,
    oxygenMlPerHour: 7,
    carbonGramsPerYear: 350,
    wildlifeScore: 4,
    daysToMature: 365,
    isIndoor: false,
  },
  {
    commonName: "Thyme",
    latinName: "Thymus vulgaris",
    category: "herb",
    pollinatorScore: 4,
    beesPerSeason: 1600,
    butterfliesPerSeason: 60,
    oxygenMlPerHour: 4,
    carbonGramsPerYear: 180,
    wildlifeScore: 3,
    daysToMature: 180,
    isIndoor: false,
  },
  {
    commonName: "Sage",
    latinName: "Salvia officinalis",
    category: "herb",
    pollinatorScore: 4,
    beesPerSeason: 1400,
    butterfliesPerSeason: 50,
    oxygenMlPerHour: 6,
    carbonGramsPerYear: 280,
    wildlifeScore: 3,
    daysToMature: 180,
    isIndoor: false,
  },
  {
    commonName: "Chives",
    latinName: "Allium schoenoprasum",
    category: "herb",
    pollinatorScore: 4,
    beesPerSeason: 1200,
    butterfliesPerSeason: 70,
    oxygenMlPerHour: 4,
    carbonGramsPerYear: 180,
    wildlifeScore: 3,
    daysToMature: 90,
    isIndoor: false,
  },
  {
    commonName: "Parsley",
    latinName: "Petroselinum crispum",
    category: "herb",
    pollinatorScore: 3,
    beesPerSeason: 600,
    butterfliesPerSeason: 90,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 200,
    wildlifeScore: 3,
    daysToMature: 80,
    isIndoor: false,
  },
  {
    commonName: "Dill",
    latinName: "Anethum graveolens",
    category: "herb",
    pollinatorScore: 4,
    beesPerSeason: 1000,
    butterfliesPerSeason: 120,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 200,
    wildlifeScore: 3,
    daysToMature: 70,
    isIndoor: false,
  },

  // ── Vegetables ───────────────────────────────────────────────────────
  {
    commonName: "Tomato",
    latinName: "Solanum lycopersicum",
    category: "vegetable",
    pollinatorScore: 3,
    beesPerSeason: 800,
    butterfliesPerSeason: 20,
    oxygenMlPerHour: 8,
    carbonGramsPerYear: 350,
    wildlifeScore: 2,
    daysToMature: 90,
    isIndoor: false,
  },
  {
    commonName: "Courgette",
    latinName: "Cucurbita pepo",
    category: "vegetable",
    pollinatorScore: 3,
    beesPerSeason: 900,
    butterfliesPerSeason: 15,
    oxygenMlPerHour: 10,
    carbonGramsPerYear: 420,
    wildlifeScore: 2,
    daysToMature: 60,
    isIndoor: false,
  },
  {
    commonName: "Runner Bean",
    latinName: "Phaseolus coccineus",
    category: "vegetable",
    pollinatorScore: 4,
    beesPerSeason: 1200,
    butterfliesPerSeason: 30,
    oxygenMlPerHour: 9,
    carbonGramsPerYear: 380,
    wildlifeScore: 3,
    daysToMature: 75,
    isIndoor: false,
  },
  {
    commonName: "Sweetcorn",
    latinName: "Zea mays",
    category: "vegetable",
    pollinatorScore: 1,
    beesPerSeason: 100,
    butterfliesPerSeason: 10,
    oxygenMlPerHour: 14,
    carbonGramsPerYear: 500,
    wildlifeScore: 2,
    daysToMature: 100,
    isIndoor: false,
  },
  {
    commonName: "Potato",
    latinName: "Solanum tuberosum",
    category: "vegetable",
    pollinatorScore: 2,
    beesPerSeason: 300,
    butterfliesPerSeason: 10,
    oxygenMlPerHour: 8,
    carbonGramsPerYear: 350,
    wildlifeScore: 2,
    daysToMature: 100,
    isIndoor: false,
  },
  {
    commonName: "Carrot",
    latinName: "Daucus carota",
    category: "vegetable",
    pollinatorScore: 3,
    beesPerSeason: 500,
    butterfliesPerSeason: 60,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 200,
    wildlifeScore: 3,
    daysToMature: 80,
    isIndoor: false,
  },

  // ── Fruit ────────────────────────────────────────────────────────────
  {
    commonName: "Strawberry",
    latinName: "Fragaria x ananassa",
    category: "fruit",
    pollinatorScore: 4,
    beesPerSeason: 1400,
    butterfliesPerSeason: 40,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 220,
    wildlifeScore: 4,
    daysToMature: 90,
    isIndoor: false,
  },
  {
    commonName: "Apple",
    latinName: "Malus domestica",
    category: "fruit",
    pollinatorScore: 4,
    beesPerSeason: 2000,
    butterfliesPerSeason: 60,
    oxygenMlPerHour: 20,
    carbonGramsPerYear: 2500,
    wildlifeScore: 5,
    daysToMature: 1095,
    isIndoor: false,
  },
  {
    commonName: "Fig",
    latinName: "Ficus carica",
    category: "fruit",
    pollinatorScore: 1,
    beesPerSeason: 100,
    butterfliesPerSeason: 10,
    oxygenMlPerHour: 12,
    carbonGramsPerYear: 800,
    wildlifeScore: 3,
    daysToMature: 730,
    isIndoor: false,
  },
  {
    commonName: "Raspberry",
    latinName: "Rubus idaeus",
    category: "fruit",
    pollinatorScore: 4,
    beesPerSeason: 1600,
    butterfliesPerSeason: 50,
    oxygenMlPerHour: 8,
    carbonGramsPerYear: 400,
    wildlifeScore: 5,
    daysToMature: 365,
    isIndoor: false,
  },

  // ── Indoor / Houseplants ─────────────────────────────────────────────
  {
    commonName: "Peace Lily",
    latinName: "Spathiphyllum",
    category: "flower",
    pollinatorScore: 0,
    beesPerSeason: 0,
    butterfliesPerSeason: 0,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 350,
    wildlifeScore: 0,
    daysToMature: 365,
    isIndoor: true,
  },
  {
    commonName: "Snake Plant",
    latinName: "Dracaena trifasciata",
    category: "flower",
    pollinatorScore: 0,
    beesPerSeason: 0,
    butterfliesPerSeason: 0,
    oxygenMlPerHour: 4,
    carbonGramsPerYear: 320,
    wildlifeScore: 0,
    daysToMature: 365,
    isIndoor: true,
  },
  {
    commonName: "Spider Plant",
    latinName: "Chlorophytum comosum",
    category: "flower",
    pollinatorScore: 0,
    beesPerSeason: 0,
    butterfliesPerSeason: 0,
    oxygenMlPerHour: 4,
    carbonGramsPerYear: 280,
    wildlifeScore: 0,
    daysToMature: 180,
    isIndoor: true,
  },
  {
    commonName: "Pothos",
    latinName: "Epipremnum aureum",
    category: "flower",
    pollinatorScore: 0,
    beesPerSeason: 0,
    butterfliesPerSeason: 0,
    oxygenMlPerHour: 3,
    carbonGramsPerYear: 250,
    wildlifeScore: 0,
    daysToMature: 180,
    isIndoor: true,
  },
  {
    commonName: "Aloe Vera",
    latinName: "Aloe barbadensis miller",
    category: "herb",
    pollinatorScore: 0,
    beesPerSeason: 0,
    butterfliesPerSeason: 0,
    oxygenMlPerHour: 3,
    carbonGramsPerYear: 200,
    wildlifeScore: 0,
    daysToMature: 365,
    isIndoor: true,
  },
];

// ---------------------------------------------------------------------------
// Category-level fallbacks for unknown plants
// ---------------------------------------------------------------------------

const CATEGORY_DEFAULTS: Record<string, Omit<PlantRecord, "commonName" | "latinName" | "category">> = {
  flower: {
    pollinatorScore: 3,
    beesPerSeason: 800,
    butterfliesPerSeason: 80,
    oxygenMlPerHour: 6,
    carbonGramsPerYear: 250,
    wildlifeScore: 3,
    daysToMature: 90,
    isIndoor: false,
  },
  herb: {
    pollinatorScore: 3,
    beesPerSeason: 700,
    butterfliesPerSeason: 50,
    oxygenMlPerHour: 5,
    carbonGramsPerYear: 220,
    wildlifeScore: 2,
    daysToMature: 80,
    isIndoor: false,
  },
  vegetable: {
    pollinatorScore: 2,
    beesPerSeason: 400,
    butterfliesPerSeason: 20,
    oxygenMlPerHour: 8,
    carbonGramsPerYear: 300,
    wildlifeScore: 2,
    daysToMature: 80,
    isIndoor: false,
  },
  fruit: {
    pollinatorScore: 3,
    beesPerSeason: 1000,
    butterfliesPerSeason: 40,
    oxygenMlPerHour: 8,
    carbonGramsPerYear: 400,
    wildlifeScore: 3,
    daysToMature: 180,
    isIndoor: false,
  },
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findPlantRecord(
  commonName: string,
  latinName: string,
  category: "flower" | "herb" | "vegetable" | "fruit",
  location: "indoor" | "outdoor"
): PlantRecord {
  const normCommon = normalize(commonName);
  const normLatin = normalize(latinName);

  // Try exact match on latin name first (most specific)
  for (const p of KNOWN_PLANTS) {
    if (normLatin && normalize(p.latinName) === normLatin) return p;
  }

  // Try partial match on latin name (genus match)
  for (const p of KNOWN_PLANTS) {
    const pLatin = normalize(p.latinName);
    if (normLatin && (pLatin.includes(normLatin) || normLatin.includes(pLatin))) {
      return p;
    }
  }

  // Try exact common name match
  for (const p of KNOWN_PLANTS) {
    if (normalize(p.commonName) === normCommon) return p;
  }

  // Try partial common name match
  for (const p of KNOWN_PLANTS) {
    const pCommon = normalize(p.commonName);
    if (normCommon.includes(pCommon) || pCommon.includes(normCommon)) {
      return p;
    }
  }

  // Fall back to category defaults
  const defaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.flower;
  return {
    commonName,
    latinName,
    category,
    ...defaults,
    isIndoor: location === "indoor",
  };
}

// ---------------------------------------------------------------------------
// Season scaling
// ---------------------------------------------------------------------------

type Season = "winter" | "spring" | "summer" | "autumn";

function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

const POLLINATOR_SEASON_MULTIPLIER: Record<Season, number> = {
  winter: 0,
  spring: 0.7,
  summer: 1,
  autumn: 0.5,
};

// ---------------------------------------------------------------------------
// Grade calculation
// ---------------------------------------------------------------------------

function calculateGrade(
  pollinatorScore: number,
  wildlifeScore: number,
  oxygenMlPerHour: number,
  carbonGramsPerYear: number,
  isIndoor: boolean
): { impactGrade: string; gradeStars: number } {
  // Composite score weighted towards plant's strength area
  // Indoor plants are graded on air quality; outdoor on ecology
  let composite: number;

  if (isIndoor) {
    // Weight: 50% O2, 30% CO2, 20% baseline
    const o2Score = Math.min(oxygenMlPerHour / 6, 1); // 6ml/hr = top indoor
    const co2Score = Math.min(carbonGramsPerYear / 400, 1);
    composite = o2Score * 0.5 + co2Score * 0.3 + 0.2;
  } else {
    // Weight: 40% pollinator, 25% wildlife, 20% CO2, 15% O2
    const pollScore = pollinatorScore / 5;
    const wildScore = wildlifeScore / 5;
    const co2Score = Math.min(carbonGramsPerYear / 650, 1);
    const o2Score = Math.min(oxygenMlPerHour / 14, 1);
    composite = pollScore * 0.4 + wildScore * 0.25 + co2Score * 0.2 + o2Score * 0.15;
  }

  // Map composite (0-1) to grades
  if (composite >= 0.9) return { impactGrade: "A+", gradeStars: 5 };
  if (composite >= 0.8) return { impactGrade: "A", gradeStars: 5 };
  if (composite >= 0.7) return { impactGrade: "A-", gradeStars: 4 };
  if (composite >= 0.6) return { impactGrade: "B+", gradeStars: 4 };
  if (composite >= 0.5) return { impactGrade: "B", gradeStars: 3 };
  if (composite >= 0.4) return { impactGrade: "B-", gradeStars: 3 };
  if (composite >= 0.3) return { impactGrade: "C+", gradeStars: 2 };
  return { impactGrade: "C", gradeStars: 1 };
}

// ---------------------------------------------------------------------------
// Primary stat selection
// ---------------------------------------------------------------------------

/**
 * Picks the two most relevant stats to display on a plant card.
 *
 * Logic:
 * - Indoor plants always get O2 + CO2 (pollinators are irrelevant indoors)
 * - Outdoor flowers/herbs with high pollinator score -> bees + butterflies
 * - Outdoor vegetables -> bees + O2 (practical + ecological)
 * - Outdoor fruit -> bees + wildlife
 * - If pollinator score is low (wind-pollinated veg like sweetcorn) -> O2 + CO2
 */
function selectPrimaryStats(
  record: PlantRecord,
  location: "indoor" | "outdoor",
  scaledBees: number,
  scaledButterflies: number
): [ImpactStat, ImpactStat] {
  const isIndoor = location === "indoor" || record.isIndoor;

  if (isIndoor) {
    return [
      {
        emoji: "\uD83D\uDCA8", // 💨
        label: `~${record.oxygenMlPerHour}ml O\u2082/hr`,
        value: record.oxygenMlPerHour,
        maxValue: 20,
      },
      {
        emoji: "\uD83C\uDF3F", // 🌿
        label: `~${record.carbonGramsPerYear}g CO\u2082/yr`,
        value: record.carbonGramsPerYear,
        maxValue: 800,
      },
    ];
  }

  // Outdoor: if very low pollinator score, show air stats instead
  if (record.pollinatorScore <= 1) {
    return [
      {
        emoji: "\uD83D\uDCA8",
        label: `~${record.oxygenMlPerHour}ml O\u2082/hr`,
        value: record.oxygenMlPerHour,
        maxValue: 20,
      },
      {
        emoji: "\uD83C\uDF3F",
        label: `~${record.carbonGramsPerYear}g CO\u2082/yr`,
        value: record.carbonGramsPerYear,
        maxValue: 800,
      },
    ];
  }

  const beeStat: ImpactStat = {
    emoji: "\uD83D\uDC1D", // 🐝
    label: `~${Math.round(scaledBees)} bees`,
    value: Math.round(scaledBees),
    maxValue: 3600,
  };

  const butterflyStat: ImpactStat = {
    emoji: "\uD83E\uDD8B", // 🦋
    label: `~${Math.round(scaledButterflies)} butterflies`,
    value: Math.round(scaledButterflies),
    maxValue: 800,
  };

  const o2Stat: ImpactStat = {
    emoji: "\uD83D\uDCA8",
    label: `~${record.oxygenMlPerHour}ml O\u2082/hr`,
    value: record.oxygenMlPerHour,
    maxValue: 20,
  };

  const wildlifeStat: ImpactStat = {
    emoji: "\uD83E\uDDA5", // 🦥 -> using 🐛 for wildlife is awkward; use 🏡 for habitat
    label: `Wildlife ${record.wildlifeScore}/5`,
    value: record.wildlifeScore,
    maxValue: 5,
  };

  switch (record.category) {
    case "flower":
      // Flowers: show bees + butterflies (their primary value)
      return [beeStat, butterflyStat];

    case "herb":
      // Herbs: bees + butterflies (when flowering, herbs are great pollinators)
      return [beeStat, butterflyStat];

    case "vegetable":
      // Vegetables: bees + O2 (practical dual-purpose)
      return [beeStat, o2Stat];

    case "fruit":
      // Fruit: bees + wildlife (fruit provides habitat/food for wildlife)
      return [beeStat, wildlifeStat];

    default:
      return [beeStat, butterflyStat];
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Get ecological impact data for a plant.
 *
 * @param commonName  - e.g. "Lavender", "Snake Plant"
 * @param latinName   - e.g. "Lavandula angustifolia"
 * @param category    - "flower" | "herb" | "vegetable" | "fruit"
 * @param location    - "indoor" | "outdoor"
 * @param daysSinceSow - Optional: days since sowing for age scaling
 * @returns PlantImpact with all scores and the two primary display stats
 */
export function getPlantImpact(
  commonName: string,
  latinName: string,
  category: "flower" | "herb" | "vegetable" | "fruit",
  location: "indoor" | "outdoor",
  daysSinceSow?: number
): PlantImpact {
  const record = findPlantRecord(commonName, latinName, category, location);
  const isIndoor = location === "indoor" || record.isIndoor;

  // ── Season scaling (pollinators only) ──
  const season = getCurrentSeason();
  const seasonMultiplier = isIndoor ? 0 : POLLINATOR_SEASON_MULTIPLIER[season];

  // ── Age scaling ──
  // Young plants contribute less. Scales linearly from 0 to 1 over daysToMature.
  const ageMultiplier =
    daysSinceSow != null
      ? Math.min(1, Math.max(0, daysSinceSow / record.daysToMature))
      : 1;

  // ── Apply scaling ──
  const scaledBees = record.beesPerSeason * seasonMultiplier * ageMultiplier;
  const scaledButterflies = record.butterfliesPerSeason * seasonMultiplier * ageMultiplier;

  // O2 and CO2 scale with age but not season (photosynthesis happens year-round
  // at reduced rate, but we keep it simple — mature plant = full rate)
  const scaledO2 = record.oxygenMlPerHour * ageMultiplier;
  const scaledCO2 = record.carbonGramsPerYear * ageMultiplier;

  // ── Grade ──
  const { impactGrade, gradeStars } = calculateGrade(
    record.pollinatorScore,
    record.wildlifeScore,
    record.oxygenMlPerHour,
    record.carbonGramsPerYear,
    isIndoor
  );

  // ── Primary stats ──
  const primaryStats = selectPrimaryStats(record, location, scaledBees, scaledButterflies);

  return {
    pollinatorScore: isIndoor ? 0 : record.pollinatorScore,
    beesPerSeason: Math.round(scaledBees),
    butterfliesPerSeason: Math.round(scaledButterflies),
    oxygenMlPerHour: Math.round(scaledO2 * 10) / 10,
    carbonGramsPerYear: Math.round(scaledCO2),
    wildlifeScore: isIndoor ? 0 : record.wildlifeScore,
    impactGrade,
    gradeStars,
    primaryStats,
  };
}

// ---------------------------------------------------------------------------
// Utility: get all known plant names (for autocomplete / matching)
// ---------------------------------------------------------------------------

export function getKnownPlantNames(): Array<{ commonName: string; latinName: string }> {
  return KNOWN_PLANTS.map((p) => ({
    commonName: p.commonName,
    latinName: p.latinName,
  }));
}
