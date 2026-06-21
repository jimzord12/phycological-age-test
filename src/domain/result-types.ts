/**
 * Domain result types for the Reflective Maturity Profile.
 *
 * These mirror the discriminated unions required by the PRD (§13) and the
 * Domain document (§9–§11, §19). Finite states are modelled as unions rather
 * than free-form strings (PRD §13, §26).
 */

import type { ScoringVersion } from "./versions";

/** The five structured dimensions. Narrative Self-Awareness (NSA) is scored separately. */
export type DimensionId = "ER" | "IC" | "PT" | "IS" | "TD";

export const DIMENSION_IDS: readonly DimensionId[] = ["ER", "IC", "PT", "IS", "TD"];

/** Snake_case keys used by the canonical result object (DOMAIN §19). */
export type DimensionKey =
  | "emotional_regulation"
  | "impulse_control"
  | "perspective_taking"
  | "identity_stability"
  | "temporal_depth";

/** A single structured answer references a question and the chosen option. */
export type StructuredAnswer = { questionId: string; optionId: string };

/** Per-dimension scoring outcome (PRD §13). */
export type DimensionResult =
  | { status: "reportable"; score: number; answered: number; available: number }
  | { status: "insufficient_data"; answered: number; required: number; available: number };

/** Profile balance is descriptive, not punitive (DOMAIN §9.4). */
export type ProfileBalanceLabel =
  | "relatively_balanced"
  | "some_unevenness"
  | "strongly_uneven";

export type ProfileBalance = {
  spread: number;
  label: ProfileBalanceLabel;
};

/** Reasons that reduced confidence. Finite, machine-readable codes (PRD §13). */
export type ConfidenceReason =
  | { code: "extra_not_applicable"; count: number; deducted: number }
  | { code: "non_reportable_dimension"; dimension: DimensionId; deducted: number }
  | { code: "low_coverage"; missingOrNa: number; deducted: number }
  | { code: "inconsistent_pair"; pair: [string, string]; deducted: number };

export type ConfidenceLabel = "high" | "moderate" | "low";

export type ConfidenceResult = {
  score: number;
  label: ConfidenceLabel;
  reasons: ConfidenceReason[];
};

/** Deterministic structured result (DOMAIN §9, §19). */
export type StructuredAssessmentResult = {
  scoringVersion: ScoringVersion;
  dimensions: Record<DimensionId, DimensionResult>;
  /** Equally weighted mean of the five normalized dimensions, or null when any is insufficient. */
  structuredMaturityIndex: number | null;
  /** Spread/label over reportable dimensions, or null when none are reportable. */
  profileBalance: ProfileBalance | null;
};

/** Narrative rubric criteria, each 0–2 (DOMAIN §10.2). */
export type NarrativeRubricScores = {
  specificity: 0 | 1 | 2;
  ownership: 0 | 1 | 2;
  emotionalPrecision: 0 | 1 | 2;
  causalDepth: 0 | 1 | 2;
  qualityOfUncertainty: 0 | 1 | 2;
  behavioralIntegration: 0 | 1 | 2;
};

export type PerformativeAbstractionPenalty = 0 | 1 | 2;

export type NarrativeConfidence = "high" | "moderate" | "low" | "not_available";

/**
 * Narrative score outcome (DOMAIN §10.4, §11.5).
 * - `scored`: both exercises met their content thresholds.
 * - `limited_evidence`: exactly one exercise met its threshold.
 * - `not_scored`: neither exercise met its threshold (return this, never zero).
 */
export type NarrativeScoreResult =
  | {
      status: "scored";
      score: number;
      confidence: NarrativeConfidence;
      rubric: NarrativeRubricScores;
      penalty: PerformativeAbstractionPenalty;
    }
  | {
      status: "limited_evidence";
      score: number;
      confidence: NarrativeConfidence;
      rubric: NarrativeRubricScores;
      penalty: PerformativeAbstractionPenalty;
    }
  | { status: "not_scored" };

/** Validation errors for an incoming answer set (PRD §17). */
export type AnswerSetError =
  | { code: "version_mismatch"; expected: string; received: string }
  | { code: "unknown_question"; questionId: string }
  | { code: "unknown_option"; questionId: string; optionId: string }
  | { code: "duplicate_answer"; questionId: string };

export type ValidationResult =
  | { ok: true; answers: StructuredAnswer[] }
  | { ok: false; errors: AnswerSetError[] };
