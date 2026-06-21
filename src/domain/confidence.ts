/**
 * Confidence calculation (DOMAIN §11).
 *
 * Confidence describes the stability of the result given the available
 * response set. It is NOT a truthfulness score and never changes a dimension
 * score. A discrepancy must not be described as deception (DOMAIN §11.3).
 */

import { getOptionScore, STRUCTURED_QUESTIONS } from "./questionnaire";
import {
  type ConfidenceLabel,
  type ConfidenceReason,
  type ConfidenceResult,
  DIMENSION_IDS,
  type DimensionId,
  type DimensionResult,
  type StructuredAnswer,
} from "./result-types";
import { normalizeItemScore } from "./scoring";

/** Loose consistency pairs that should usually be directionally related (DOMAIN §11.3). */
const CONSISTENCY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["ER01", "ER05"],
  ["IC01", "IC05"],
  ["PT02", "PT03"],
  ["IS01", "IS03"],
  ["TD01", "TD03"],
];

type ItemClassification = "scored" | "not_applicable" | "unanswered";

function classifyItems(answers: readonly StructuredAnswer[]): Map<string, ItemClassification> {
  const byId = new Map<string, string>();
  for (const answer of answers) byId.set(answer.questionId, answer.optionId);

  const classification = new Map<string, ItemClassification>();
  for (const question of STRUCTURED_QUESTIONS) {
    const optionId = byId.get(question.id);
    if (optionId === undefined) {
      classification.set(question.id, "unanswered");
      continue;
    }
    const score = getOptionScore(question.id, optionId);
    classification.set(question.id, score === null ? "not_applicable" : "scored");
  }
  return classification;
}

function scoredValue(answers: readonly StructuredAnswer[], questionId: string): number | null {
  const answer = answers.find((a) => a.questionId === questionId);
  if (!answer) return null;
  const score = getOptionScore(questionId, answer.optionId);
  return typeof score === "number" ? score : null;
}

function labelFor(score: number): ConfidenceLabel {
  if (score >= 85) return "high";
  if (score >= 65) return "moderate";
  return "low";
}

/**
 * Calculate confidence from the response set and the per-dimension results.
 * Starts at 100 and applies the coverage and loose-consistency deductions in
 * DOMAIN §11.2–§11.3, then clamps to 0–100.
 */
export function calculateConfidence(
  answers: readonly StructuredAnswer[],
  dimensions: Record<DimensionId, DimensionResult>,
): ConfidenceResult {
  const reasons: ConfidenceReason[] = [];
  let score = 100;

  const classification = classifyItems(answers);
  let naCount = 0;
  let missingOrNa = 0;
  for (const value of classification.values()) {
    if (value === "not_applicable") {
      naCount += 1;
      missingOrNa += 1;
    } else if (value === "unanswered") {
      missingOrNa += 1;
    }
  }

  // Subtract 5 for each `Not applicable` response after the first two.
  const extraNa = Math.max(0, naCount - 2);
  if (extraNa > 0) {
    const deducted = extraNa * 5;
    score -= deducted;
    reasons.push({ code: "extra_not_applicable", count: extraNa, deducted });
  }

  // Subtract 15 for each non-reportable structured dimension.
  for (const dimension of DIMENSION_IDS) {
    if (dimensions[dimension].status !== "reportable") {
      score -= 15;
      reasons.push({ code: "non_reportable_dimension", dimension, deducted: 15 });
    }
  }

  // Subtract 10 when more than four structured items are unanswered or not applicable.
  if (missingOrNa > 4) {
    score -= 10;
    reasons.push({ code: "low_coverage", missingOrNa, deducted: 10 });
  }

  // Loose consistency: if a pair of scored items differs by more than 75
  // normalized points, subtract 5.
  for (const [a, b] of CONSISTENCY_PAIRS) {
    const sa = scoredValue(answers, a);
    const sb = scoredValue(answers, b);
    if (sa === null || sb === null) continue;
    const diff = Math.abs(normalizeItemScore(sa) - normalizeItemScore(sb));
    if (diff > 75) {
      score -= 5;
      reasons.push({ code: "inconsistent_pair", pair: [a, b], deducted: 5 });
    }
  }

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, label: labelFor(clamped), reasons };
}
