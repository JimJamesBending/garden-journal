import { Plant, CareEvent, GrowthEntry, AdviceEntry, WeatherForecast } from "./types";
import {
  getCareProfile,
  getMonthlyTask,
  checkRepottingNeeded,
  estimateHarvestDate,
  getPlantsDueForSowing,
} from "./plant-care";
import { getFrostAlert, getWateringAdvice } from "./weather";

function makeId(): string {
  return `advice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function expiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const now = () => new Date().toISOString();

/**
 * Generate all advice based on current garden state + weather.
 * This is the core AI Gardener brain.
 */
export function generateAdvice(
  plants: Plant[],
  careEvents: CareEvent[],
  growthEntries: GrowthEntry[],
  forecast: WeatherForecast | null
): AdviceEntry[] {
  const advice: AdviceEntry[] = [];
  const month = new Date().getMonth() + 1;

  // --- WEATHER ALERTS (highest priority) ---
  if (forecast) {
    const frostAlert = getFrostAlert(forecast);
    if (frostAlert) {
      advice.push({
        id: makeId(),
        category: "weather-alert",
        priority: "urgent",
        title: "Frost warning!",
        body: frostAlert,
        plantId: "",
        actionRequired: true,
        dismissed: false,
        generatedAt: now(),
        expiresAt: expiry(3),
        source: "weather-api",
      });
    }

    // Watering advice
    const wateringAdvice = getWateringAdvice(forecast);
    advice.push({
      id: makeId(),
      category: "this-week",
      priority: "medium",
      title: "Watering update",
      body: wateringAdvice,
      plantId: "",
      actionRequired: false,
      dismissed: false,
      generatedAt: now(),
      expiresAt: expiry(3),
      source: "weather-api",
    });

    // Temperature context
    if (forecast.current.tempMax > 28) {
      advice.push({
        id: makeId(),
        category: "weather-alert",
        priority: "high",
        title: "Heatwave conditions",
        body: `It's forecast to hit ${forecast.current.tempMax}°C today. Water all pots morning and evening — terracotta dries out fast. Move sensitive seedlings to partial shade if possible. Your basil will love it, but lettuce and peas will bolt.`,
        plantId: "",
        actionRequired: true,
        dismissed: false,
        generatedAt: now(),
        expiresAt: expiry(2),
        source: "weather-api",
      });
    }

    if (forecast.current.windSpeed > 40) {
      advice.push({
        id: makeId(),
        category: "weather-alert",
        priority: "high",
        title: "Strong winds expected",
        body: `Wind speeds up to ${forecast.current.windSpeed} km/h forecast. Check stakes on sunflowers and any tall plants. Move lightweight pots to shelter if possible.`,
        plantId: "",
        actionRequired: true,
        dismissed: false,
        generatedAt: now(),
        expiresAt: expiry(2),
        source: "weather-api",
      });
    }
  }

  // --- PER-PLANT ADVICE ---
  for (const plant of plants) {
    const profile = getCareProfile(plant.id) || getCareProfile(plant.slug);
    if (!profile) continue;

    // Monthly task
    const monthTask = getMonthlyTask(plant.id, month) || getMonthlyTask(plant.slug, month);
    if (monthTask) {
      advice.push({
        id: makeId(),
        category: "seasonal",
        priority: "medium",
        title: `${plant.commonName} — this month`,
        body: monthTask,
        plantId: plant.id,
        actionRequired: true,
        dismissed: false,
        generatedAt: now(),
        expiresAt: expiry(30),
        source: "knowledge-base",
      });
    }

    // Repotting check
    const repotAdvice = checkRepottingNeeded(
      plant.id,
      plant.sowDate,
      "germinated" // Default — in future, read from latest log
    );
    if (repotAdvice) {
      advice.push({
        id: makeId(),
        category: "this-week",
        priority: "high",
        title: `Time to repot your ${plant.commonName}`,
        body: repotAdvice,
        plantId: plant.id,
        actionRequired: true,
        dismissed: false,
        generatedAt: now(),
        expiresAt: expiry(14),
        source: "knowledge-base",
      });
    }

    // Harvest countdown
    const harvest = estimateHarvestDate(plant.id, plant.sowDate) ||
      estimateHarvestDate(plant.slug, plant.sowDate);
    if (harvest && harvest.daysRemaining > 0 && harvest.daysRemaining < 60) {
      advice.push({
        id: makeId(),
        category: "harvest",
        priority: "low",
        title: `${plant.commonName} harvest countdown`,
        body: `Based on sowing date and typical growth, your ${plant.commonName} should be ready to harvest around ${new Date(harvest.estimated).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — roughly ${harvest.daysRemaining} days away. ${profile.harvestTips}`,
        plantId: plant.id,
        actionRequired: false,
        dismissed: false,
        generatedAt: now(),
        expiresAt: expiry(14),
        source: "knowledge-base",
      });
    }

    // Watering reminder — check last watered event
    const lastWatered = careEvents
      .filter((e) => e.plantId === plant.id && e.type === "watered")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (lastWatered) {
      const daysSinceWatered = Math.floor(
        (Date.now() - new Date(lastWatered.date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const needsWatering =
        (profile.wateringNeeds === "high" && daysSinceWatered >= 2) ||
        (profile.wateringNeeds === "moderate" && daysSinceWatered >= 3) ||
        (profile.wateringNeeds === "moderate-high" && daysSinceWatered >= 2) ||
        (profile.wateringNeeds === "low-moderate" && daysSinceWatered >= 5) ||
        (profile.wateringNeeds === "low" && daysSinceWatered >= 7);

      if (needsWatering) {
        // Check if rain is forecast
        const rainExpected =
          forecast?.daily.slice(0, 2).some((d) => d.precipitation > 3) ?? false;

        if (rainExpected) {
          advice.push({
            id: makeId(),
            category: "this-week",
            priority: "low",
            title: `Skip watering your ${plant.commonName}`,
            body: `It's been ${daysSinceWatered} days since you last watered your ${plant.commonName}, but rain is forecast — let nature do the work. ${profile.wateringNotes}`,
            plantId: plant.id,
            actionRequired: false,
            dismissed: false,
            generatedAt: now(),
            expiresAt: expiry(2),
            source: "weather-api",
          });
        } else {
          advice.push({
            id: makeId(),
            category: "this-week",
            priority: daysSinceWatered > 5 ? "high" : "medium",
            title: `Water your ${plant.commonName}`,
            body: `It's been ${daysSinceWatered} days since you last watered. ${profile.wateringNotes}`,
            plantId: plant.id,
            actionRequired: true,
            dismissed: false,
            generatedAt: now(),
            expiresAt: expiry(2),
            source: "growth-data",
          });
        }
      }
    }

    // Feeding reminder
    const lastFed = careEvents
      .filter((e) => e.plantId === plant.id && e.type === "fed")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (lastFed) {
      const daysSinceFed = Math.floor(
        (Date.now() - new Date(lastFed.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceFed > 14 && profile.feedingSchedule && !profile.feedingSchedule.includes("None")) {
        advice.push({
          id: makeId(),
          category: "this-week",
          priority: "medium",
          title: `Feed your ${plant.commonName}`,
          body: `It's been ${daysSinceFed} days since the last feed. ${profile.feedingSchedule}.`,
          plantId: plant.id,
          actionRequired: true,
          dismissed: false,
          generatedAt: now(),
          expiresAt: expiry(7),
          source: "growth-data",
        });
      }
    }

    // Growth stall detection
    const plantGrowth = growthEntries
      .filter((g) => g.plantId === plant.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (plantGrowth.length >= 2) {
      const latest = plantGrowth[0];
      const previous = plantGrowth[1];
      if (
        latest.heightCm !== null &&
        previous.heightCm !== null &&
        latest.heightCm <= previous.heightCm
      ) {
        const daysBetween = Math.floor(
          (new Date(latest.date).getTime() - new Date(previous.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysBetween > 7) {
          advice.push({
            id: makeId(),
            category: "problem",
            priority: "high",
            title: `${plant.commonName} growth has stalled`,
            body: `Your ${plant.commonName} hasn't grown in ${daysBetween} days (still at ${latest.heightCm}cm). This could be temperature-related, a watering issue, or it might need potting on. ${profile.commonProblems.length > 0 ? `Common issue: ${profile.commonProblems[0].problem} — ${profile.commonProblems[0].symptoms}.` : ""}`,
            plantId: plant.id,
            actionRequired: true,
            dismissed: false,
            generatedAt: now(),
            expiresAt: expiry(7),
            source: "growth-data",
          });
        }
      }
    }
  }

  // --- GENERAL SEASONAL ADVICE ---
  const sowingDue = getPlantsDueForSowing(month);
  if (sowingDue.indoor.length > 0) {
    const names = sowingDue.indoor.map((p) => p.profile.commonName);
    advice.push({
      id: makeId(),
      category: "seasonal",
      priority: "info",
      title: "Good time to sow indoors",
      body: `This month is a good window for sowing ${names.join(", ")} indoors. Check your seed packets for specific instructions.`,
      plantId: "",
      actionRequired: false,
      dismissed: false,
      generatedAt: now(),
      expiresAt: expiry(30),
      source: "knowledge-base",
    });
  }

  // --- BUY LIST ---
  const buyItems: string[] = [];
  for (const plant of plants) {
    const repot = checkRepottingNeeded(plant.id, plant.sowDate, "germinated");
    if (repot) {
      const profile = getCareProfile(plant.id) || getCareProfile(plant.slug);
      if (profile?.repottingSize) {
        buyItems.push(`Pots for ${plant.commonName} (${profile.repottingSize})`);
      }
      buyItems.push("Multipurpose compost");
    }
  }

  if (buyItems.length > 0) {
    const unique = [...new Set(buyItems)];
    advice.push({
      id: makeId(),
      category: "buy-list",
      priority: "low",
      title: "Shopping list",
      body: `Things to pick up soon:\n${unique.map((i) => `• ${i}`).join("\n")}`,
      plantId: "",
      actionRequired: false,
      dismissed: false,
      generatedAt: now(),
      expiresAt: expiry(14),
      source: "knowledge-base",
    });
  }

  // --- FUN FACTS ---
  const funFacts = [
    { fact: "Sweet peas were first cultivated in Sicily in 1699 by a monk named Francisco Cupani. Yours are carrying on a 327-year tradition!", plant: "sweet-pea" },
    { fact: "Tomatoes were once thought to be poisonous in Europe — they were grown as ornamental plants for over 200 years before anyone dared eat one.", plant: "tomato" },
    { fact: "The world's largest onion weighed over 8.5kg — grown in the UK! Ailsa Craig is actually an exhibition variety capable of growing enormous bulbs.", plant: "onion-ailsa-craig" },
    { fact: "Foxgloves contain digitalis, which is used in heart medication. Beautiful and medically important — but don't eat any part of the plant!", plant: "foxglove" },
    { fact: "Basil is sacred in Hindu tradition and is planted around temples. The word 'basil' comes from the Greek 'basileus' meaning king.", plant: "basil" },
    { fact: "Sunflowers track the sun across the sky (heliotropism) when young — but once the flower head opens, it faces east permanently to warm up quickly in the morning.", plant: "sunflower" },
    { fact: "Strawberries are the only fruit with seeds on the outside. A single strawberry has about 200 seeds!", plant: "strawberry" },
    { fact: "Lavender was used by Romans to scent their bath water. The name comes from the Latin 'lavare' meaning to wash.", plant: "lavender" },
    { fact: "Daffodils are one of the first flowers to appear in spring because the bulbs store energy from the previous year's leaves.", plant: "daffodil" },
  ];

  // Pick a random fun fact
  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
  advice.push({
    id: makeId(),
    category: "fun-fact",
    priority: "info",
    title: "Did you know?",
    body: randomFact.fact,
    plantId: randomFact.plant,
    actionRequired: false,
    dismissed: false,
    generatedAt: now(),
    expiresAt: expiry(7),
    source: "knowledge-base",
  });

  // --- ENCOURAGEMENT ---
  advice.push({
    id: makeId(),
    category: "fun-fact",
    priority: "info",
    title: "Garden stats",
    body: `You're tracking ${plants.length} plants with ${careEvents.length} care events logged and ${growthEntries.length} growth measurements. Your garden journal is really coming together!`,
    plantId: "",
    actionRequired: false,
    dismissed: false,
    generatedAt: now(),
    expiresAt: expiry(7),
    source: "growth-data",
  });

  // Sort by priority
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  advice.sort(
    (a, b) => (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5)
  );

  return advice;
}
