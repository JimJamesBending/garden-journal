import type {
  WizardPhoto,
  WizardQuestion,
  WizardOption,
  Plant,
  Space,
  PhotoCategory,
} from "@/lib/types";
import { thumbnail } from "@/lib/cloudinary";

/**
 * Generate adaptive questions based on AI-sorted photos + existing data.
 * Pure function — no API calls.
 */
export function generateQuestions(
  photos: WizardPhoto[],
  existingPlants: Plant[],
  existingSpaces: Space[],
  existingLogs: { plantId: string; cloudinaryUrl: string }[]
): WizardQuestion[] {
  const questions: WizardQuestion[] = [];
  let qIndex = 0;

  const getCategory = (p: WizardPhoto): PhotoCategory =>
    p.userOverrideCategory || p.category || "unclear";

  // Helper to get a plant's photo thumbnail
  const getPlantThumb = (plantId: string): string | undefined => {
    const log = existingLogs.find(
      (l) => l.plantId === plantId && l.cloudinaryUrl
    );
    return log ? thumbnail(log.cloudinaryUrl) : undefined;
  };

  // --- Plant photos ---
  const plantPhotos = photos.filter((p) => getCategory(p) === "plant");

  for (const photo of plantPhotos) {
    // "Which plant is this?"
    const plantOptions: WizardOption[] = existingPlants.map((p) => ({
      id: `existing:${p.id}`,
      label: p.commonName,
      sublabel: p.variety || undefined,
      thumbnailUrl: getPlantThumb(p.id),
    }));

    // If AI identified the plant, check for match and put it first
    if (photo.plantIdResult) {
      const matchName = photo.plantIdResult.commonName.toLowerCase();
      const matchIdx = plantOptions.findIndex(
        (o) => o.label.toLowerCase() === matchName
      );
      if (matchIdx > 0) {
        const [match] = plantOptions.splice(matchIdx, 1);
        match.sublabel = `${photo.plantIdResult.confidence}% match`;
        plantOptions.unshift(match);
      }
    }

    plantOptions.push({
      id: "new-plant",
      label: "New plant",
      icon: "\u2795",
    });
    plantOptions.push({
      id: "not-sure",
      label: "I\u2019m not sure",
      icon: "\u{1F937}",
    });

    questions.push({
      id: `q-plant-${qIndex++}`,
      photoIds: [photo.id],
      questionText: photo.plantIdResult
        ? `This looks like ${photo.plantIdResult.commonName}. Is that right?`
        : "Which plant is this?",
      type: "single-choice",
      options: plantOptions,
      answer: null,
      skipped: false,
      required: false,
    });
  }

  // --- Label photos ---
  const labelPhotos = photos.filter((p) => getCategory(p) === "label");

  for (const photo of labelPhotos) {
    if (photo.ocrText) {
      // AI read the label — confirm the name
      const extractedName = extractPlantName(photo.ocrText);
      const options: WizardOption[] = [];

      if (extractedName) {
        // Check if plant already exists
        const existing = existingPlants.find(
          (p) => p.commonName.toLowerCase() === extractedName.toLowerCase()
        );
        if (existing) {
          options.push({
            id: `existing:${existing.id}`,
            label: `Yes, it\u2019s my ${existing.commonName}`,
            icon: "\u2705",
            thumbnailUrl: getPlantThumb(existing.id),
          });
        } else {
          options.push({
            id: `new-from-label:${extractedName}`,
            label: `Yes, create "${extractedName}"`,
            icon: "\u2705",
          });
        }
      }

      options.push({
        id: "different-plant",
        label: "No, it\u2019s something else",
        icon: "\u274C",
      });

      questions.push({
        id: `q-label-${qIndex++}`,
        photoIds: [photo.id],
        questionText: extractedName
          ? `I can see "${extractedName}" on this label. Is that right?`
          : "I read some text on this label. Which plant is it for?",
        type: "single-choice",
        options,
        answer: null,
        skipped: false,
        required: false,
      });
    } else {
      // Couldn't read label — ask manually
      const plantOptions: WizardOption[] = existingPlants.map((p) => ({
        id: `existing:${p.id}`,
        label: p.commonName,
        sublabel: p.variety || undefined,
        thumbnailUrl: getPlantThumb(p.id),
      }));
      plantOptions.push({ id: "new-plant", label: "New plant", icon: "\u2795" });

      questions.push({
        id: `q-label-${qIndex++}`,
        photoIds: [photo.id],
        questionText: "Which plant is this label for?",
        type: "single-choice",
        options: plantOptions,
        answer: null,
        skipped: false,
        required: false,
      });
    }
  }

  // --- Soil photos ---
  const soilPhotos = photos.filter((p) => getCategory(p) === "soil");

  if (soilPhotos.length > 0) {
    questions.push({
      id: `q-soil-${qIndex++}`,
      photoIds: soilPhotos.map((p) => p.id),
      questionText: "What\u2019s happening with the soil?",
      type: "single-choice",
      options: [
        { id: "just-planted", label: "Just planted seeds", icon: "\u{1F331}" },
        { id: "preparing", label: "Preparing a bed", icon: "\u{1F6A7}" },
        { id: "checking", label: "Checking the soil", icon: "\u{1F50D}" },
        { id: "nothing", label: "Nothing specific", icon: "\u{1F937}" },
      ],
      answer: null,
      skipped: false,
      required: false,
    });
  }

  // --- Overview photos ---
  const overviewPhotos = photos.filter((p) => getCategory(p) === "overview");

  if (overviewPhotos.length > 0) {
    const spaceOptions: WizardOption[] = existingSpaces.map((s) => ({
      id: `space:${s.id}`,
      label: s.name,
      sublabel: s.type.replace(/-/g, " "),
    }));
    spaceOptions.push({ id: "new-space", label: "New space", icon: "\u2795" });
    spaceOptions.push({ id: "just-photo", label: "Just a nice photo", icon: "\u{1F4F7}" });

    questions.push({
      id: `q-overview-${qIndex++}`,
      photoIds: overviewPhotos.map((p) => p.id),
      questionText: "Which growing space is this?",
      type: "single-choice",
      options: spaceOptions,
      answer: null,
      skipped: false,
      required: false,
    });
  }

  // --- For new plants identified: ask type and stage ---
  // These get generated per-answer in the wizard flow, but we generate placeholders
  // for any photo where AI suggested a new plant
  const newPlantPhotos = plantPhotos.filter((p) => {
    if (!p.plantIdResult) return false;
    const matchName = p.plantIdResult.commonName.toLowerCase();
    return !existingPlants.some((ep) => ep.commonName.toLowerCase() === matchName);
  });

  if (newPlantPhotos.length > 0) {
    // Type question for all new plants
    questions.push({
      id: `q-type-${qIndex++}`,
      photoIds: newPlantPhotos.map((p) => p.id),
      questionText: "What type of plant are the new ones?",
      type: "single-choice",
      options: [
        { id: "fruit", label: "Fruit", icon: "\u{1F353}" },
        { id: "vegetable", label: "Vegetable", icon: "\u{1F966}" },
        { id: "herb", label: "Herb", icon: "\u{1F33F}" },
        { id: "flower", label: "Flower", icon: "\u{1F33A}" },
      ],
      answer: null,
      skipped: false,
      required: false,
    });
  }

  // --- Growth stage question (for all plant photos) ---
  if (plantPhotos.length > 0) {
    questions.push({
      id: `q-stage-${qIndex++}`,
      photoIds: plantPhotos.map((p) => p.id),
      questionText: "What stage are the plants at?",
      type: "single-choice",
      options: [
        { id: "sowed", label: "Just sowed", icon: "\u{1F331}" },
        { id: "germinated", label: "Sprouting", icon: "\u{1F33E}" },
        { id: "transplanted", label: "Growing well", icon: "\u{1F33F}" },
        { id: "flowering", label: "Flowering", icon: "\u{1F33C}" },
        { id: "harvested", label: "Ready to harvest", icon: "\u{1F345}" },
      ],
      answer: null,
      skipped: false,
      required: false,
    });
  }

  // --- Care question (for all photos) ---
  questions.push({
    id: `q-care-${qIndex++}`,
    photoIds: photos.map((p) => p.id),
    questionText: "Did you do any care today?",
    type: "single-choice",
    options: [
      { id: "watered", label: "Watered", icon: "\u{1F4A7}" },
      { id: "fed", label: "Fed", icon: "\u{1F33F}" },
      { id: "pruned", label: "Pruned", icon: "\u2702\uFE0F" },
      { id: "nothing", label: "Nothing", icon: "\u{1F44C}" },
    ],
    answer: null,
    skipped: false,
    required: false,
  });

  return questions;
}

/**
 * Try to extract a plant name from OCR text.
 * Looks for common patterns on seed packets / labels.
 */
function extractPlantName(ocrText: string): string | null {
  // Try first line (often the plant name on labels)
  const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Skip very short or very long lines (likely not plant names)
  const candidates = lines.filter((l) => l.length >= 3 && l.length <= 50);
  if (candidates.length === 0) return null;

  // First non-trivial line is often the plant name
  return candidates[0];
}
