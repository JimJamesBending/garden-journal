import type {
  WizardState,
  WizardStep,
  WizardPhoto,
  WizardAction,
  WizardSortResponse,
  WizardProcessResponse,
} from "@/lib/types";

// --- Action Types ---

export type WizardReducerAction =
  | { type: "ADD_PHOTOS"; photos: WizardPhoto[] }
  | { type: "REMOVE_PHOTO"; id: string }
  | { type: "UPDATE_UPLOAD"; id: string; progress: number; url?: string; thumbnailUrl?: string }
  | { type: "SET_SORT_RESULTS"; results: WizardSortResponse }
  | { type: "SET_ACTIONS"; actions: WizardAction[] }
  | { type: "PROCESS_START" }
  | { type: "PROCESS_UPDATE"; message: string }
  | { type: "PROCESS_COMPLETE"; result: WizardProcessResponse }
  | { type: "REMOVE_ACTION"; index: number }
  | { type: "SET_ERROR"; error: string }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "START_IDENTIFYING" }
  | { type: "SET_IDENTIFIED"; name: string; confidence: number; careTips: string | null }
  | { type: "CONFIRM_NAME"; name: string }
  | { type: "SET_SAVED"; plantName: string }
  | { type: "RESET" };

// --- Initial State ---

export const initialWizardState: WizardState = {
  step: "photo",
  photos: [],
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  actions: [],
  processing: false,
  processingMessage: "",
  error: null,
  complete: false,
  identifying: false,
  identifiedName: null,
  identifiedConfidence: 0,
  identifiedCareTips: null,
  confirmedName: null,
  savedPlantName: null,
};

// --- Reducer ---

export function wizardReducer(
  state: WizardState,
  action: WizardReducerAction
): WizardState {
  switch (action.type) {
    case "ADD_PHOTOS":
      return {
        ...state,
        photos: [...state.photos, ...action.photos],
        error: null,
      };

    case "REMOVE_PHOTO":
      return {
        ...state,
        photos: state.photos.filter((p) => p.id !== action.id),
      };

    case "UPDATE_UPLOAD": {
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.id
            ? {
                ...p,
                uploadProgress: action.progress,
                uploading: action.progress < 100,
                ...(action.url ? { cloudinaryUrl: action.url } : {}),
                ...(action.thumbnailUrl ? { thumbnailUrl: action.thumbnailUrl } : {}),
              }
            : p
        ),
      };
    }

    case "START_IDENTIFYING":
      return {
        ...state,
        step: "results",
        identifying: true,
        identifiedName: null,
        identifiedConfidence: 0,
        identifiedCareTips: null,
        confirmedName: null,
        error: null,
      };

    case "SET_SORT_RESULTS": {
      const firstResult = action.results.results[0];
      if (!firstResult) {
        return {
          ...state,
          identifying: false,
          identifiedName: null,
          identifiedConfidence: 0,
          identifiedCareTips: null,
        };
      }

      // Update the photo with sort results
      const updatedPhotos = state.photos.map((photo) => {
        const result = action.results.results.find((r) => r.url === photo.cloudinaryUrl);
        if (!result) return photo;
        return {
          ...photo,
          category: result.category,
          categoryConfidence: result.confidence,
          ocrText: result.ocrText,
          plantIdResult: result.plantIdSuggestion,
          aiNotes: result.aiNotes,
        };
      });

      const plantId = firstResult.plantIdSuggestion;
      return {
        ...state,
        photos: updatedPhotos,
        identifying: false,
        identifiedName: plantId?.commonName || null,
        identifiedConfidence: plantId?.confidence || 0,
        identifiedCareTips: firstResult.aiNotes || null,
      };
    }

    case "CONFIRM_NAME":
      return {
        ...state,
        confirmedName: action.name,
      };

    case "SET_ACTIONS":
      return {
        ...state,
        actions: action.actions,
      };

    case "PROCESS_START":
      return {
        ...state,
        processing: true,
        processingMessage: "Saving to your garden...",
        error: null,
      };

    case "PROCESS_UPDATE":
      return {
        ...state,
        processingMessage: action.message,
      };

    case "PROCESS_COMPLETE":
      return {
        ...state,
        processing: false,
        complete: true,
        step: "done",
        processingMessage: "",
        savedPlantName: state.confirmedName || state.identifiedName || "Your plant",
      };

    case "SET_SAVED":
      return {
        ...state,
        step: "done",
        savedPlantName: action.plantName,
        processing: false,
        complete: true,
      };

    case "REMOVE_ACTION":
      return {
        ...state,
        actions: state.actions.filter((_, i) => i !== action.index),
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        processing: false,
        identifying: false,
      };

    case "GO_TO_STEP":
      return {
        ...state,
        step: action.step,
        error: null,
      };

    case "RESET":
      return { ...initialWizardState };

    default:
      return state;
  }
}
