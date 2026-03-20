import type {
  WizardState,
  WizardStep,
  WizardPhoto,
  WizardQuestion,
  WizardAction,
  PhotoCategory,
  WizardSortResponse,
  WizardProcessResponse,
} from "@/lib/types";

// --- Action Types ---

export type WizardReducerAction =
  | { type: "ADD_PHOTOS"; photos: WizardPhoto[] }
  | { type: "REMOVE_PHOTO"; id: string }
  | { type: "UPDATE_UPLOAD"; id: string; progress: number; url?: string; thumbnailUrl?: string }
  | { type: "SET_SORT_RESULTS"; results: WizardSortResponse }
  | { type: "OVERRIDE_CATEGORY"; photoId: string; category: PhotoCategory }
  | { type: "SET_QUESTIONS"; questions: WizardQuestion[] }
  | { type: "ANSWER_QUESTION"; questionId: string; answer: string }
  | { type: "SKIP_QUESTION"; questionId: string }
  | { type: "SET_ACTIONS"; actions: WizardAction[] }
  | { type: "PROCESS_START" }
  | { type: "PROCESS_UPDATE"; message: string }
  | { type: "PROCESS_COMPLETE"; result: WizardProcessResponse }
  | { type: "EDIT_ACTION"; index: number; action: WizardAction }
  | { type: "REMOVE_ACTION"; index: number }
  | { type: "SET_ERROR"; error: string }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "RESET" };

// --- Initial State ---

export const initialWizardState: WizardState = {
  step: "capture",
  photos: [],
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  actions: [],
  processing: false,
  processingMessage: "",
  error: null,
  complete: false,
};

// --- Category cycle order for tap-to-change ---

const CATEGORY_ORDER: PhotoCategory[] = ["plant", "label", "overview", "soil", "unclear"];

function nextCategory(current: PhotoCategory): PhotoCategory {
  const idx = CATEGORY_ORDER.indexOf(current);
  return CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length];
}

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

    case "SET_SORT_RESULTS": {
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
      return {
        ...state,
        photos: updatedPhotos,
        step: "sort",
        error: null,
      };
    }

    case "OVERRIDE_CATEGORY": {
      return {
        ...state,
        photos: state.photos.map((p) => {
          if (p.id !== action.photoId) return p;
          const currentCat = p.userOverrideCategory || p.category || "unclear";
          const newCat = action.category || nextCategory(currentCat);
          return {
            ...p,
            userOverrideCategory: newCat,
          };
        }),
      };
    }

    case "SET_QUESTIONS":
      return {
        ...state,
        questions: action.questions,
        currentQuestionIndex: 0,
        step: "questions",
        error: null,
      };

    case "ANSWER_QUESTION": {
      const newAnswers = { ...state.answers, [action.questionId]: action.answer };
      const updatedQuestions = state.questions.map((q) =>
        q.id === action.questionId ? { ...q, answer: action.answer, skipped: false } : q
      );
      const nextIndex = state.currentQuestionIndex + 1;
      return {
        ...state,
        answers: newAnswers,
        questions: updatedQuestions,
        currentQuestionIndex: nextIndex,
      };
    }

    case "SKIP_QUESTION": {
      const updatedQuestions = state.questions.map((q) =>
        q.id === action.questionId ? { ...q, skipped: true } : q
      );
      const nextIndex = state.currentQuestionIndex + 1;
      return {
        ...state,
        questions: updatedQuestions,
        currentQuestionIndex: nextIndex,
      };
    }

    case "SET_ACTIONS":
      return {
        ...state,
        actions: action.actions,
      };

    case "PROCESS_START":
      return {
        ...state,
        step: "working",
        processing: true,
        processingMessage: "Getting everything ready...",
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
        step: "review",
        processingMessage: "",
      };

    case "EDIT_ACTION":
      return {
        ...state,
        actions: state.actions.map((a, i) =>
          i === action.index ? action.action : a
        ),
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
