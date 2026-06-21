"use client";

/**
 * React context for the assessment flow.
 *
 * Responsibilities:
 *  - Initialize state from sessionStorage on mount (or fresh if none found).
 *  - Detect questionnaire version mismatches and surface them without scoring.
 *  - Debounce writes to sessionStorage on every state change (PRD §18).
 *  - Block sessionStorage writes while a version mismatch is unresolved.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  assessmentReducer,
  isVersionMismatch,
  makeInitialState,
  type AssessmentAction,
  type AssessmentState,
} from "./assessment-state";
import {
  clearAssessmentDraft,
  exportDraftAsJson,
  loadAssessmentDraft,
  makeDebouncedSave,
  STORAGE_DEBOUNCE_MS,
} from "./storage";
import { QUESTIONNAIRE_VERSION } from "@/domain/versions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VersionMismatch = {
  storedState: AssessmentState;
  currentVersion: string;
};

export type AssessmentContextValue = {
  state: AssessmentState;
  dispatch: Dispatch<AssessmentAction>;
  /** Non-null when a stored draft was created under a different questionnaire version. */
  versionMismatch: VersionMismatch | null;
  /** Clears the mismatched draft from sessionStorage and resets to a fresh state. */
  discardMismatchedDraft: () => void;
  /** Downloads the mismatched draft as JSON, then clears it and resets state. */
  exportMismatchedDraft: () => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

// ---------------------------------------------------------------------------
// Internal storage status (three-state machine)
// ---------------------------------------------------------------------------

type StorageStatus =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "mismatch"; storedState: AssessmentState };

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({ status: "checking" });

  const [state, dispatch] = useReducer(assessmentReducer, undefined, (): AssessmentState => {
    // Init function: load from sessionStorage synchronously.
    // If a version mismatch is found here, we start fresh and surface the
    // mismatch via the mount effect below (can't call setState in init fn).
    const stored = loadAssessmentDraft();
    if (!stored) return makeInitialState(QUESTIONNAIRE_VERSION);
    if (isVersionMismatch(stored, QUESTIONNAIRE_VERSION)) {
      return makeInitialState(QUESTIONNAIRE_VERSION);
    }
    return stored;
  });

  // Stable debounced save function — created once per provider instance.
  const debouncedSave = useRef(makeDebouncedSave(STORAGE_DEBOUNCE_MS));

  // Mount: check for version mismatch and transition storage status.
  // This runs after the first render so we can call setState safely.
  useEffect(() => {
    const stored = loadAssessmentDraft();
    if (stored && isVersionMismatch(stored, QUESTIONNAIRE_VERSION)) {
      setStorageStatus({ status: "mismatch", storedState: stored });
    } else {
      setStorageStatus({ status: "ready" });
    }
  }, []);

  // Debounced save — only fires when storage is "ready" (no mismatch pending).
  // This prevents overwriting a mismatched draft before the user can export it.
  useEffect(() => {
    if (storageStatus.status !== "ready") return;
    debouncedSave.current(state);
  }, [state, storageStatus]);

  const discardMismatchedDraft = useCallback(() => {
    clearAssessmentDraft();
    setStorageStatus({ status: "ready" });
    dispatch({ type: "DISCARD", newVersion: QUESTIONNAIRE_VERSION });
  }, []);

  const exportMismatchedDraft = useCallback(() => {
    if (storageStatus.status !== "mismatch") return;
    exportDraftAsJson(storageStatus.storedState);
    clearAssessmentDraft();
    setStorageStatus({ status: "ready" });
    dispatch({ type: "DISCARD", newVersion: QUESTIONNAIRE_VERSION });
  }, [storageStatus]);

  const versionMismatch = useMemo<VersionMismatch | null>(
    () =>
      storageStatus.status === "mismatch"
        ? { storedState: storageStatus.storedState, currentVersion: QUESTIONNAIRE_VERSION }
        : null,
    [storageStatus],
  );

  const value = useMemo<AssessmentContextValue>(
    () => ({ state, dispatch, versionMismatch, discardMismatchedDraft, exportMismatchedDraft }),
    [state, versionMismatch, discardMismatchedDraft, exportMismatchedDraft],
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAssessment(): AssessmentContextValue {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used within AssessmentProvider");
  return ctx;
}
