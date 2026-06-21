/**
 * Pure deterministic scoring (DOMAIN §9).
 *
 * No network, no Date, no I/O. Rounding happens only at the formula points
 * defined by the Domain document. Score maps are server-owned and read from
 * the canonical question bank.
 */

import {
  getOptionScore,
  getStructuredQuestion,
  questionsForDimension,
  STRUCTURED_QUESTIONS,
} from "./questionnaire";
import {
  type AnswerSetError,
  DIMENSION_IDS,
  type DimensionId,
  type DimensionResult,
  type ProfileBalance,
  type StructuredAnswer,
  type StructuredAssessmentResult,
  type ValidationResult,
} from "./result-types";
import { QUESTIONNAIRE_VERSION, SCORING_VERSION } from "./versions";

/** Minimum scored items per dimension to be reportable (DOMAIN §9.2). */
const REQUIRED_ANSWERS: Record<DimensionId, number> = {
  ER: 4,
  IC: 4,
  PT: 4,
  IS: 3,
  TD: 4,
};

/** Standard half-up rounding for non-negative results. Deterministic. */
function roundScore(value: number): number {
  return Math.round(value);
}

/** Normalize a 1–5 item score to the 0–100 scale (DOMAIN §9.2, §11.3). */
export function normalizeItemScore(score: number): number {
  return ((score - 1) / 4) * 100;
}

/**
 * Validate an incoming answer set against the canonical bank (PRD §17).
 * Returns typed errors for version mismatch, unknown questions/options, and
 * duplicate answers rather than throwing.
 */
export function validateAnswerSet(
  questionnaireVersion: string,
  answers: readonly StructuredAnswer[],
): ValidationResult {
  const errors: AnswerSetError[] = [];

  if (questionnaireVersion !== QUESTIONNAIRE_VERSION) {
    errors.push({
      code: "version_mismatch",
      expected: QUESTIONNAIRE_VERSION,
      received: questionnaireVersion,
    });
  }

  const seen = new Set<string>();
  for (const answer of answers) {
    const question = getStructuredQuestion(answer.questionId);
    if (!question) {
      errors.push({ code: "unknown_question", questionId: answer.questionId });
      continue;
    }
    if (seen.has(answer.questionId)) {
      errors.push({ code: "duplicate_answer", questionId: answer.questionId });
    }
    seen.add(answer.questionId);
    const optionExists = question.options.some((o) => o.id === answer.optionId);
    if (!optionExists) {
      errors.push({
        code: "unknown_option",
        questionId: answer.questionId,
        optionId: answer.optionId,
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, answers: [...answers] };
}

/** Index answers by question id. Assumes a validated (deduplicated) set. */
function indexAnswers(answers: readonly StructuredAnswer[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const answer of answers) map.set(answer.questionId, answer.optionId);
  return map;
}

/**
 * Score a single dimension (DOMAIN §9.2).
 * `Not applicable` (null score) is excluded from the denominator.
 */
export function scoreDimension(
  dimension: DimensionId,
  answers: readonly StructuredAnswer[],
): DimensionResult {
  const questions = questionsForDimension(dimension);
  const available = questions.length;
  const required = REQUIRED_ANSWERS[dimension];
  const byId = indexAnswers(answers);

  const scores: number[] = [];
  for (const question of questions) {
    const optionId = byId.get(question.id);
    if (optionId === undefined) continue; // unanswered
    const score = getOptionScore(question.id, optionId);
    if (score === null || score === undefined) continue; // NA or invalid -> excluded
    scores.push(score);
  }

  const answered = scores.length;
  if (answered < required) {
    return { status: "insufficient_data", answered, required, available };
  }

  const rawMean = scores.reduce((sum, s) => sum + s, 0) / answered;
  const score = roundScore(normalizeItemScore(rawMean));
  return { status: "reportable", score, answered, available };
}

/**
 * Score all five dimensions and the Structured Maturity Index (DOMAIN §9.2–§9.4).
 * The index is only defined when every dimension is reportable; otherwise null.
 */
export function scoreStructuredAssessment(
  answers: readonly StructuredAnswer[],
): StructuredAssessmentResult {
  const dimensions = {} as Record<DimensionId, DimensionResult>;
  for (const dimension of DIMENSION_IDS) {
    dimensions[dimension] = scoreDimension(dimension, answers);
  }

  const allReportable = DIMENSION_IDS.every((d) => dimensions[d].status === "reportable");
  let structuredMaturityIndex: number | null = null;
  if (allReportable) {
    const total = DIMENSION_IDS.reduce((sum, d) => {
      const result = dimensions[d];
      return result.status === "reportable" ? sum + result.score : sum;
    }, 0);
    structuredMaturityIndex = roundScore(total / DIMENSION_IDS.length);
  }

  return {
    scoringVersion: SCORING_VERSION,
    dimensions,
    structuredMaturityIndex,
    profileBalance: calculateProfileBalance(dimensions),
  };
}

/**
 * Descriptive spread across reportable dimensions (DOMAIN §9.4).
 * Returns null when no dimension is reportable.
 */
export function calculateProfileBalance(
  dimensions: Record<DimensionId, DimensionResult>,
): ProfileBalance | null {
  const scores: number[] = [];
  for (const dimension of DIMENSION_IDS) {
    const result = dimensions[dimension];
    if (result.status === "reportable") scores.push(result.score);
  }
  if (scores.length === 0) return null;

  const spread = Math.max(...scores) - Math.min(...scores);
  const label =
    spread <= 14 ? "relatively_balanced" : spread <= 29 ? "some_unevenness" : "strongly_uneven";
  return { spread, label };
}

/**
 * Optional, opt-in maturity-age metaphor (DOMAIN §9.5).
 * Returns null when disabled or when the index is unavailable.
 */
export function calculateAgeMetaphor(
  structuredMaturityIndex: number | null,
  enabled: boolean,
): number | null {
  if (!enabled || structuredMaturityIndex === null) return null;
  return roundScore(16 + (structuredMaturityIndex / 100) * 56);
}

/** Total number of structured items in the canonical bank (24 for RMP-1.0). */
export const STRUCTURED_ITEM_COUNT = STRUCTURED_QUESTIONS.length;
