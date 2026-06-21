/**
 * Canonical version identifiers. These are domain constants and must only
 * change together with a corresponding versioned change to questionnaire
 * content, score maps, rubric rules, or the AI prompt (DOMAIN §17).
 */
export const QUESTIONNAIRE_VERSION = "RMP-1.0" as const;
export const SCORING_VERSION = "RMP-SCORE-1.0" as const;
export const PROMPT_VERSION = "RMP-AI-1.0" as const;

export type QuestionnaireVersion = typeof QUESTIONNAIRE_VERSION;
export type ScoringVersion = typeof SCORING_VERSION;
export type PromptVersion = typeof PROMPT_VERSION;
