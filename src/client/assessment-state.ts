/**
 * Pure client-side assessment state: types, reducer, and helpers.
 * No DOM, no React, no network — safe to test in a node environment.
 */

/** Finite phases of the assessment flow (PRD §18). */
export type AssessmentPhase =
  | "consent"
  | "questionnaire"
  | "narrative"
  | "review"
  | "submitted";

/**
 * Legal/eligibility consent (PRD §7.3, §18).
 * Must be confirmed before the questionnaire can be started.
 */
export type ConsentRecord = {
  eligibilityConfirmed: boolean;
};

/**
 * Functional output preferences selected on the consent screen (PRD §18).
 * Separate from consent — these gate optional features, not eligibility.
 */
export type UserPreferences = {
  includeAiAnalysis: boolean;
  includeAgeMetaphor: boolean;
};

/**
 * Narrative drafts keyed by exercise id then field id (PRD §10.2, §18).
 * These are stored in sessionStorage only — never localStorage.
 */
export type NarrativeDrafts = Record<string, Record<string, string>>;

/** Full client-side assessment state (PRD §18). */
export type AssessmentState = {
  /** Version string at the time this state was created (e.g. "RMP-1.0"). */
  questionnaireVersion: string;
  phase: AssessmentPhase;
  /** Zero-based step index within the current phase. */
  stepIndex: number;
  /** Maps structured questionId → chosen optionId. */
  structuredAnswers: Record<string, string>;
  narrativeDrafts: NarrativeDrafts;
  consent: ConsentRecord;
  preferences: UserPreferences;
};

export type AssessmentAction =
  | { type: "SET_PHASE"; phase: AssessmentPhase }
  | { type: "SET_STEP"; stepIndex: number }
  | { type: "SET_ANSWER"; questionId: string; optionId: string }
  | { type: "CLEAR_ANSWER"; questionId: string }
  | { type: "SET_NARRATIVE_FIELD"; exerciseId: string; fieldId: string; text: string }
  | { type: "SET_CONSENT"; patch: Partial<ConsentRecord> }
  | { type: "SET_PREFERENCES"; patch: Partial<UserPreferences> }
  | { type: "RESTORE"; state: AssessmentState }
  | { type: "DISCARD"; newVersion: string };

export function makeInitialState(questionnaireVersion: string): AssessmentState {
  return {
    questionnaireVersion,
    phase: "consent",
    stepIndex: 0,
    structuredAnswers: {},
    narrativeDrafts: {},
    consent: { eligibilityConfirmed: false },
    preferences: { includeAiAnalysis: false, includeAgeMetaphor: false },
  };
}

export function assessmentReducer(
  state: AssessmentState,
  action: AssessmentAction,
): AssessmentState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "SET_STEP":
      return { ...state, stepIndex: action.stepIndex };

    case "SET_ANSWER":
      return {
        ...state,
        structuredAnswers: { ...state.structuredAnswers, [action.questionId]: action.optionId },
      };

    case "CLEAR_ANSWER": {
      const next = { ...state.structuredAnswers };
      delete next[action.questionId];
      return { ...state, structuredAnswers: next };
    }

    case "SET_NARRATIVE_FIELD":
      return {
        ...state,
        narrativeDrafts: {
          ...state.narrativeDrafts,
          [action.exerciseId]: {
            ...(state.narrativeDrafts[action.exerciseId] ?? {}),
            [action.fieldId]: action.text,
          },
        },
      };

    case "SET_CONSENT":
      return { ...state, consent: { ...state.consent, ...action.patch } };

    case "SET_PREFERENCES":
      return { ...state, preferences: { ...state.preferences, ...action.patch } };

    case "RESTORE":
      return action.state;

    case "DISCARD":
      return makeInitialState(action.newVersion);
  }
}

/** True when a stored draft was created under a different questionnaire version. */
export function isVersionMismatch(stored: AssessmentState, currentVersion: string): boolean {
  return stored.questionnaireVersion !== currentVersion;
}
