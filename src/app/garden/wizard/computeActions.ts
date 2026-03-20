import type {
  WizardPhoto,
  WizardQuestion,
  WizardAction,
  Plant,
  PhotoCategory,
  PlantStatus,
} from "@/lib/types";

/**
 * Translate wizard answers + photos into API action payloads.
 * Pure function — no API calls.
 */
export function computeActions(
  photos: WizardPhoto[],
  questions: WizardQuestion[],
  answers: Record<string, string>,
  existingPlants: Plant[]
): WizardAction[] {
  const actions: WizardAction[] = [];
  const today = new Date().toISOString().split("T")[0];

  const getCategory = (p: WizardPhoto): PhotoCategory =>
    p.userOverrideCategory || p.category || "unclear";

  // Track new plants to create (deduplicate)
  const newPlantsToCreate = new Map<string, { name: string; category: string; latinName: string }>();

  // Find answers for specific question types
  const findAnswer = (prefix: string): string | null => {
    for (const q of questions) {
      if (q.id.startsWith(prefix) && answers[q.id] && !q.skipped) {
        return answers[q.id];
      }
    }
    return null;
  };

  // Get growth stage from answers
  const stageAnswer = findAnswer("q-stage-");
  const status: PlantStatus = (stageAnswer as PlantStatus) || "sowed";

  // Get plant type from answers
  const typeAnswer = findAnswer("q-type-");
  const plantCategory = typeAnswer || "vegetable";

  // Get care action
  const careAnswer = findAnswer("q-care-");

  // --- Process plant photo assignments ---
  const plantPhotos = photos.filter((p) => getCategory(p) === "plant");

  for (const photo of plantPhotos) {
    // Find the question for this photo
    const photoQuestion = questions.find(
      (q) => q.photoIds.includes(photo.id) && q.id.startsWith("q-plant-")
    );
    const answer = photoQuestion ? answers[photoQuestion.id] : null;

    if (!answer || photoQuestion?.skipped) {
      // No answer — create unassigned log
      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId: "",
          caption: photo.aiNotes || "",
          status,
        },
        description: "Added photo (unassigned)",
      });
      continue;
    }

    if (answer.startsWith("existing:")) {
      // Assign to existing plant
      const plantId = answer.replace("existing:", "");
      const plant = existingPlants.find((p) => p.id === plantId);
      const plantName = plant?.commonName || "Unknown";

      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId,
          caption: photo.aiNotes || `${plantName} \u2014 ${today}`,
          status,
        },
        description: `Added photo to ${plantName}`,
        plantName,
      });
    } else if (answer === "new-plant") {
      // New plant from AI identification
      const name = photo.plantIdResult?.commonName || "New Plant";
      const latinName = photo.plantIdResult?.species || "";
      const tempId = `__NEW_${name.toLowerCase().replace(/\s+/g, "_")}__`;

      if (!newPlantsToCreate.has(tempId)) {
        newPlantsToCreate.set(tempId, {
          name,
          category: plantCategory,
          latinName,
        });
      }

      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId: tempId,
          caption: photo.aiNotes || `${name} \u2014 ${today}`,
          status,
        },
        description: `Added photo to ${name}`,
        plantName: name,
      });
    }
    // "not-sure" — create unassigned log
    else if (answer === "not-sure") {
      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId: "",
          caption: photo.aiNotes || "",
          status,
        },
        description: "Added photo (unassigned)",
      });
    }
  }

  // --- Process label photos ---
  const labelPhotos = photos.filter((p) => getCategory(p) === "label");

  for (const photo of labelPhotos) {
    const labelQuestion = questions.find(
      (q) => q.photoIds.includes(photo.id) && q.id.startsWith("q-label-")
    );
    const answer = labelQuestion ? answers[labelQuestion.id] : null;

    if (!answer || labelQuestion?.skipped) {
      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId: "",
          caption: photo.ocrText ? `Label: ${photo.ocrText.slice(0, 100)}` : "Plant label",
          status: "sowed",
        },
        description: "Added label photo (unassigned)",
      });
      continue;
    }

    if (answer.startsWith("existing:")) {
      const plantId = answer.replace("existing:", "");
      const plant = existingPlants.find((p) => p.id === plantId);
      const plantName = plant?.commonName || "Unknown";

      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId,
          caption: photo.ocrText ? `Label: ${photo.ocrText.slice(0, 100)}` : `${plantName} label`,
          status: "sowed",
        },
        description: `Added label to ${plantName}`,
        plantName,
      });
    } else if (answer.startsWith("new-from-label:")) {
      const name = answer.replace("new-from-label:", "");
      const tempId = `__NEW_${name.toLowerCase().replace(/\s+/g, "_")}__`;

      if (!newPlantsToCreate.has(tempId)) {
        newPlantsToCreate.set(tempId, {
          name,
          category: plantCategory,
          latinName: "",
        });
      }

      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId: tempId,
          caption: photo.ocrText ? `Label: ${photo.ocrText.slice(0, 100)}` : `${name} label`,
          status: "sowed",
        },
        description: `Added label to ${name}`,
        plantName: name,
      });
    } else if (answer.startsWith("other:")) {
      const name = answer.replace("other:", "");
      const tempId = `__NEW_${name.toLowerCase().replace(/\s+/g, "_")}__`;

      if (!newPlantsToCreate.has(tempId)) {
        newPlantsToCreate.set(tempId, {
          name,
          category: plantCategory,
          latinName: "",
        });
      }

      actions.push({
        type: "create-log",
        data: {
          cloudinaryUrl: photo.cloudinaryUrl,
          plantId: tempId,
          caption: `${name} label`,
          status: "sowed",
        },
        description: `Added label to ${name}`,
        plantName: name,
      });
    }
  }

  // --- Overview and soil photos — just create logs ---
  const overviewPhotos = photos.filter((p) => getCategory(p) === "overview");
  for (const photo of overviewPhotos) {
    actions.push({
      type: "create-log",
      data: {
        cloudinaryUrl: photo.cloudinaryUrl,
        plantId: "",
        caption: photo.aiNotes || "Garden overview",
        status: "sowed",
      },
      description: "Added overview photo",
      plantName: "Garden Overview",
    });
  }

  const soilPhotos = photos.filter((p) => getCategory(p) === "soil");
  for (const photo of soilPhotos) {
    actions.push({
      type: "create-log",
      data: {
        cloudinaryUrl: photo.cloudinaryUrl,
        plantId: "",
        caption: photo.aiNotes || "Soil photo",
        status: "sowed",
      },
      description: "Added soil photo",
      plantName: "Soil & Ground",
    });
  }

  // --- Unclear photos ---
  const unclearPhotos = photos.filter((p) => getCategory(p) === "unclear");
  for (const photo of unclearPhotos) {
    actions.push({
      type: "create-log",
      data: {
        cloudinaryUrl: photo.cloudinaryUrl,
        plantId: "",
        caption: photo.aiNotes || "",
        status: "sowed",
      },
      description: "Added photo (needs review)",
    });
  }

  // --- Create new plant actions (insert at the beginning) ---
  const createPlantActions: WizardAction[] = [];
  for (const [tempId, info] of newPlantsToCreate) {
    createPlantActions.push({
      type: "create-plant",
      data: {
        commonName: info.name,
        variety: "",
        latinName: info.latinName,
        category: info.category,
        sowDate: today,
        location: "indoor",
        notes: "",
        seedSource: "",
        tempId,
      },
      description: `Created new plant: ${info.name}`,
      plantName: info.name,
    });
  }

  // --- Care events ---
  if (careAnswer && careAnswer !== "nothing") {
    const careType = careAnswer.startsWith("other:") ? "observed" : careAnswer;
    const careNotes = careAnswer.startsWith("other:") ? careAnswer.replace("other:", "") : "";

    // Log care for all plants that had photos assigned
    const plantIds = new Set<string>();
    for (const a of actions) {
      if (a.type === "create-log" && a.data.plantId) {
        plantIds.add(a.data.plantId as string);
      }
    }

    for (const plantId of plantIds) {
      if (!plantId) continue;
      const plantName = existingPlants.find((p) => p.id === plantId)?.commonName ||
        [...newPlantsToCreate.entries()].find(([tid]) => tid === plantId)?.[1]?.name ||
        "Unknown";

      actions.push({
        type: "create-care",
        data: {
          plantId,
          type: careType,
          date: today,
          notes: careNotes,
          quantity: "",
        },
        description: `Logged ${careType} for ${plantName}`,
        plantName,
      });
    }
  }

  // Put create-plant actions at the beginning
  return [...createPlantActions, ...actions];
}
