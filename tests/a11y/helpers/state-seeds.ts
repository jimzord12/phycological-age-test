/**
 * Factories for pre-seeded AssessmentState objects used in accessibility tests.
 *
 * Tests inject these into sessionStorage via page.addInitScript() so the app
 * renders the desired screen without needing to navigate through the full flow.
 *
 * Questionnaire version must match QUESTIONNAIRE_VERSION in src/domain/versions.ts.
 */

export const QUESTIONNAIRE_VERSION = "RMP-1.0";
export const STORAGE_KEY = "rmp_draft";

/** All 24 question IDs mapped to option "A". Used to produce a fully-answered state. */
export const ALL_ANSWERS_OPTION_A: Record<string, string> = {
  ER01: "A",
  ER02: "A",
  ER03: "A",
  ER04: "A",
  ER05: "A",
  IC01: "A",
  IC02: "A",
  IC03: "A",
  IC04: "A",
  IC05: "A",
  PT01: "A",
  PT02: "A",
  PT03: "A",
  PT04: "A",
  IS01: "A",
  IS02: "A",
  IS03: "A",
  IS04: "A",
  TD01: "A",
  TD02: "A",
  TD03: "A",
  TD04: "A",
  TD05: "A",
};

type AssessmentPhase = "consent" | "questionnaire" | "narrative" | "review" | "submitted";

interface StateShape {
  questionnaireVersion: string;
  phase: AssessmentPhase;
  stepIndex: number;
  structuredAnswers: Record<string, string>;
  narrativeDrafts: Record<string, Record<string, string>>;
  consent: { eligibilityConfirmed: boolean };
  preferences: { includeAiAnalysis: boolean; includeAgeMetaphor: boolean };
}

function base(overrides: Partial<StateShape>): StateShape {
  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    phase: "consent",
    stepIndex: 0,
    structuredAnswers: {},
    narrativeDrafts: {},
    consent: { eligibilityConfirmed: false },
    preferences: { includeAiAnalysis: false, includeAgeMetaphor: false },
    ...overrides,
  };
}

/** Landing screen state (stepIndex 0 = landing, within "consent" phase). */
export const landingState = base({ phase: "consent", stepIndex: 0 });

/** Consent screen state (stepIndex 1 = consent form). */
export const consentState = base({ phase: "consent", stepIndex: 1 });

/** First structured question (stepIndex 0 in "questionnaire" phase). */
export const questionnaireState = base({
  phase: "questionnaire",
  stepIndex: 0,
  consent: { eligibilityConfirmed: true },
});

/** First narrative exercise (N01). */
export const narrativeState = base({
  phase: "narrative",
  stepIndex: 0,
  consent: { eligibilityConfirmed: true },
  structuredAnswers: ALL_ANSWERS_OPTION_A,
});

/** Review screen with a mix of answered and unanswered questions. */
export const reviewState = base({
  phase: "review",
  stepIndex: 0,
  consent: { eligibilityConfirmed: true },
  structuredAnswers: ALL_ANSWERS_OPTION_A,
  narrativeDrafts: {},
});

/** Submitted state (triggers results screen). All questions answered. */
export const submittedState = base({
  phase: "submitted",
  stepIndex: 0,
  consent: { eligibilityConfirmed: true },
  structuredAnswers: ALL_ANSWERS_OPTION_A,
  narrativeDrafts: {},
});

/** Submitted state with age metaphor enabled. */
export const submittedWithMetaphorState = base({
  phase: "submitted",
  stepIndex: 0,
  consent: { eligibilityConfirmed: true },
  preferences: { includeAiAnalysis: false, includeAgeMetaphor: true },
  structuredAnswers: ALL_ANSWERS_OPTION_A,
  narrativeDrafts: {},
});

/** Serialise a state to the JSON string stored in sessionStorage. */
export function serialise(state: StateShape): string {
  return JSON.stringify(state);
}
