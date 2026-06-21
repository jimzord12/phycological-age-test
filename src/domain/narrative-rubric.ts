/**
 * Narrative Self-Awareness scoring (DOMAIN §10, §11.5).
 *
 * The language model assigns rubric values and the performative-abstraction
 * penalty; APPLICATION CODE computes the final score here. A model-supplied
 * aggregate score is never trusted (DOMAIN §10.1, PRD §15.7).
 */

import { NARRATIVE_EXERCISES, type NarrativeExercise } from "./questionnaire";
import type {
  NarrativeConfidence,
  NarrativeRubricScores,
  NarrativeScoreResult,
  PerformativeAbstractionPenalty,
} from "./result-types";

export type NarrativeExerciseId = "N01" | "N02";

/** Whether an exercise reached its content threshold, has some content, or is empty. */
export type NarrativeContentStatus = "meets_threshold" | "meaningful" | "empty";

export type NarrativeContent = Record<NarrativeExerciseId, NarrativeContentStatus>;

const EXERCISE_BY_ID: ReadonlyMap<NarrativeExerciseId, NarrativeExercise> = new Map(
  NARRATIVE_EXERCISES.map((exercise) => [exercise.id, exercise]),
);

/** Deterministic word count: collapse whitespace and count non-empty tokens. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/** Sum the word counts of an exercise's fields. */
export function totalWords(fields: Record<string, string>): number {
  return Object.values(fields).reduce((sum, value) => sum + countWords(value), 0);
}

/**
 * Field ids whose word count exceeds the canonical hard cap for the exercise
 * (DOMAIN §8). The UI prevents this; the server still validates it (PRD §11).
 */
export function fieldsOverCap(
  exerciseId: NarrativeExerciseId,
  fields: Record<string, string>,
): string[] {
  const exercise = EXERCISE_BY_ID.get(exerciseId);
  if (!exercise) return [];
  const over: string[] = [];
  for (const field of exercise.fields) {
    const value = fields[field.id] ?? "";
    if (countWords(value) > field.maxWords) over.push(field.id);
  }
  return over;
}

/**
 * Classify one exercise's content against its minimum-word threshold.
 * A skipped exercise should be passed as empty (no fields / zero words).
 */
export function classifyExerciseContent(
  exerciseId: NarrativeExerciseId,
  fields: Record<string, string>,
  skipped: boolean,
): NarrativeContentStatus {
  if (skipped) return "empty";
  const exercise = EXERCISE_BY_ID.get(exerciseId);
  if (!exercise) return "empty";
  const words = totalWords(fields);
  if (words >= exercise.minimumTotalWords) return "meets_threshold";
  if (words > 0) return "meaningful";
  return "empty";
}

/**
 * Narrative confidence per DOMAIN §11.5. See docs/DOMAIN-DECISIONS.md DD-2.
 *
 * The Domain doc's "Low" band ("only one short exercise contains useful
 * content") corresponds to a not-scored content level (no exercise meets the
 * threshold); it is exposed here for completeness. When exactly one exercise
 * meets the threshold we report "moderate" regardless of the other's content,
 * since a full exercise is present.
 */
export function narrativeConfidence(content: NarrativeContent): NarrativeConfidence {
  const statuses = [content.N01, content.N02];
  const meets = statuses.filter((s) => s === "meets_threshold").length;
  const meaningful = statuses.filter((s) => s === "meaningful").length;

  if (meets === 2) return "high";
  if (meets === 1) return "moderate";
  if (meaningful >= 1) return "low";
  return "not_available";
}

function sumRubric(rubric: NarrativeRubricScores): number {
  return (
    rubric.specificity +
    rubric.ownership +
    rubric.emotionalPrecision +
    rubric.causalDepth +
    rubric.qualityOfUncertainty +
    rubric.behavioralIntegration
  );
}

/**
 * Compute the Narrative Self-Awareness result (DOMAIN §10.4).
 *
 * - Neither exercise meets its threshold -> `not_scored` (never zero).
 * - Exactly one meets its threshold      -> `limited_evidence`.
 * - Both meet their thresholds           -> `scored`.
 */
export function calculateNarrativeScore(
  rubric: NarrativeRubricScores,
  penalty: PerformativeAbstractionPenalty,
  content: NarrativeContent,
): NarrativeScoreResult {
  const meets = [content.N01, content.N02].filter((s) => s === "meets_threshold").length;

  if (meets === 0) return { status: "not_scored" };

  const positiveTotal = sumRubric(rubric); // 0–12
  const adjustedTotal = Math.max(0, positiveTotal - penalty);
  const score = Math.round((adjustedTotal / 12) * 100);
  const confidence = narrativeConfidence(content);

  if (meets === 2) {
    return { status: "scored", score, confidence, rubric, penalty };
  }
  return { status: "limited_evidence", score, confidence, rubric, penalty };
}
