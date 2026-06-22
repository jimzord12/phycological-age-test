/**
 * sessionStorage persistence for assessment drafts.
 *
 * All functions are browser-only; they no-op when called server-side.
 * Narrative drafts and all other draft content go to sessionStorage only —
 * never localStorage (PRD §10.2, §18).
 */

import type { AssessmentState } from "./assessment-state";

export const STORAGE_KEY = "rmp_draft" as const;
export const STORAGE_DEBOUNCE_MS = 500 as const;

/** Structural shape guard — rejects corrupted or partial JSON. */
function isAssessmentStateShape(value: unknown): value is AssessmentState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["questionnaireVersion"] === "string" &&
    typeof v["phase"] === "string" &&
    typeof v["stepIndex"] === "number" &&
    typeof v["structuredAnswers"] === "object" &&
    v["structuredAnswers"] !== null &&
    typeof v["narrativeDrafts"] === "object" &&
    v["narrativeDrafts"] !== null &&
    typeof v["consent"] === "object" &&
    v["consent"] !== null &&
    typeof v["preferences"] === "object" &&
    v["preferences"] !== null
  );
}

/** Reads the assessment draft from sessionStorage. Returns null on any error or absence. */
export function loadAssessmentDraft(): AssessmentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAssessmentStateShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persists the assessment draft to sessionStorage. Silently fails if unavailable. */
export function saveAssessmentDraft(state: AssessmentState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or access denied — non-fatal
  }
}

/** Removes the draft from sessionStorage. */
export function clearAssessmentDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}

/**
 * Triggers a browser download of the draft as JSON.
 * Used as the escape hatch when a version mismatch is detected.
 */
export function exportDraftAsJson(state: AssessmentState): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rmp-draft-export.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Returns a debounced version of fn that resets its timer on every call. */
export function makeDebouncedSave(ms: number): (state: AssessmentState) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (state: AssessmentState) => {
    clearTimeout(timer);
    timer = setTimeout(() => saveAssessmentDraft(state), ms);
  };
}
