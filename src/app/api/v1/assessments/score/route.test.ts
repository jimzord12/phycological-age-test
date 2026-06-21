import { describe, expect, it } from "vitest";
import { STRUCTURED_QUESTIONS } from "@/domain/questionnaire";
import type { DimensionId } from "@/domain/result-types";
import {
  processScoreRequest,
  ScoreResponseSchema,
  type ScoreRequestInput,
} from "./route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function optionWithScore(questionId: string, target: number): string {
  const question = STRUCTURED_QUESTIONS.find((q) => q.id === questionId);
  if (!question) throw new Error(`unknown question ${questionId}`);
  const option = question.options.find((o) => o.score === target);
  if (!option) throw new Error(`no option scoring ${target} for ${questionId}`);
  return option.id;
}

/** Full 24-item answer set where every non-NA option resolves to the given raw score. */
function fullAnswerSet(score: 1 | 2 | 3 | 4 | 5): ScoreRequestInput["answers"] {
  return STRUCTURED_QUESTIONS.map((q) => ({
    questionId: q.id,
    optionId: optionWithScore(q.id, score),
  }));
}

/** Answer set for a single dimension (leaves all others unanswered). */
function dimensionAnswers(
  dimension: DimensionId,
  optionIds: string[],
): ScoreRequestInput["answers"] {
  const questions = STRUCTURED_QUESTIONS.filter((q) => q.dimension === dimension);
  return optionIds.map((optionId, i) => ({ questionId: questions[i]!.id, optionId }));
}

const VALID_REQUEST: ScoreRequestInput = {
  questionnaireVersion: "RMP-1.0",
  answers: fullAnswerSet(5),
};

// ---------------------------------------------------------------------------
// POST /api/v1/assessments/score — I002 contract tests
// ---------------------------------------------------------------------------

describe("processScoreRequest — success paths", () => {
  it("returns ok:true with a payload that passes the Zod response schema", () => {
    const result = processScoreRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => ScoreResponseSchema.parse(result.payload)).not.toThrow();
  });

  it("scoringVersion is RMP-SCORE-1.0", () => {
    const result = processScoreRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.result.scoringVersion).toBe("RMP-SCORE-1.0");
  });

  it("assessmentId is a valid UUID (opaque, encodes no answers)", () => {
    const result = processScoreRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.assessmentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("identical answers produce identical scores (determinism)", () => {
    const a = processScoreRequest(VALID_REQUEST);
    const b = processScoreRequest(VALID_REQUEST);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    // assessmentId differs (UUID); scores must be identical
    expect(a.payload.result.dimensions).toEqual(b.payload.result.dimensions);
    expect(a.payload.result.structuredMaturityIndex).toBe(
      b.payload.result.structuredMaturityIndex,
    );
    expect(a.payload.result.confidence.score).toBe(b.payload.result.confidence.score);
  });

  it("all-5 answers yield SMI 100 and all dimensions reportable at 100", () => {
    const result = processScoreRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { dimensions, structuredMaturityIndex } = result.payload.result;
    for (const dim of ["ER", "IC", "PT", "IS", "TD"] as const) {
      expect(dimensions[dim].status).toBe("reportable");
      if (dimensions[dim].status === "reportable") {
        expect(dimensions[dim].score).toBe(100);
      }
    }
    expect(structuredMaturityIndex).toBe(100);
  });

  it("SMI is null when at least one dimension is insufficient_data (DD-1)", () => {
    // Only answer ER questions — 4 other dimensions have zero answers → insufficient
    const result = processScoreRequest({
      questionnaireVersion: "RMP-1.0",
      answers: dimensionAnswers("ER", ["C", "C", "B", "C", "C"]), // ER01-ER05 all score 5
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.result.structuredMaturityIndex).toBeNull();
  });

  it("profileBalance is null when no dimensions are reportable", () => {
    const result = processScoreRequest({
      questionnaireVersion: "RMP-1.0",
      answers: [], // zero answers → all insufficient
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.result.profileBalance).toBeNull();
  });

  it("ageMetaphor is null when not opted in (default)", () => {
    const result = processScoreRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.result.ageMetaphor).toBeNull();
  });

  it("ageMetaphor is null when explicitly set to false", () => {
    const result = processScoreRequest({
      ...VALID_REQUEST,
      preferences: { includeAgeMetaphor: false },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.result.ageMetaphor).toBeNull();
  });

  it("ageMetaphor is a number in [16, 72] when opted in and SMI is available", () => {
    const result = processScoreRequest({
      ...VALID_REQUEST,
      preferences: { includeAgeMetaphor: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { ageMetaphor } = result.payload.result;
    expect(typeof ageMetaphor).toBe("number");
    expect(ageMetaphor).toBeGreaterThanOrEqual(16);
    expect(ageMetaphor).toBeLessThanOrEqual(72);
  });

  it("ageMetaphor is null when opted in but SMI is unavailable", () => {
    // Only ER answered → SMI is null → metaphor is null even if opted in
    const result = processScoreRequest({
      questionnaireVersion: "RMP-1.0",
      answers: dimensionAnswers("ER", ["C", "C", "B", "C", "C"]),
      preferences: { includeAgeMetaphor: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.result.ageMetaphor).toBeNull();
  });

  it("Not-applicable answers are excluded from scoring (PRD §14)", () => {
    // ER: four score-5 + one NA → still reportable at 100, answered=4
    const answers = [
      ...dimensionAnswers("ER", ["C", "C", "B", "C", "NA"]),
      ...fullAnswerSet(5).filter((a) => !a.questionId.startsWith("ER")),
    ];
    const result = processScoreRequest({ questionnaireVersion: "RMP-1.0", answers });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const er = result.payload.result.dimensions.ER;
    expect(er.status).toBe("reportable");
    if (er.status === "reportable") {
      expect(er.answered).toBe(4);
      expect(er.score).toBe(100);
    }
  });

  it("returns valid confidence alongside the score", () => {
    const result = processScoreRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { confidence } = result.payload.result;
    expect(["high", "moderate", "low"]).toContain(confidence.label);
    expect(confidence.score).toBeGreaterThanOrEqual(0);
    expect(confidence.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(confidence.reasons)).toBe(true);
  });
});

describe("processScoreRequest — validation rejections", () => {
  it("rejects a version mismatch with INVALID_ANSWER_SET", () => {
    const result = processScoreRequest({
      questionnaireVersion: "RMP-0.9",
      answers: fullAnswerSet(5),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect(result.body.code).toBe("INVALID_ANSWER_SET");
    const err = result.body.fieldErrors.find((e) => e.code === "version_mismatch");
    expect(err).toBeDefined();
    if (err?.code === "version_mismatch") {
      expect(err.expected).toBe("RMP-1.0");
      expect(err.received).toBe("RMP-0.9");
    }
  });

  it("rejects an unknown question ID", () => {
    const result = processScoreRequest({
      questionnaireVersion: "RMP-1.0",
      answers: [{ questionId: "XX99", optionId: "A" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body.code).toBe("INVALID_ANSWER_SET");
    const err = result.body.fieldErrors.find((e) => e.code === "unknown_question");
    expect(err).toBeDefined();
  });

  it("rejects an unknown option ID for a known question", () => {
    const result = processScoreRequest({
      questionnaireVersion: "RMP-1.0",
      answers: [{ questionId: "ER01", optionId: "Z" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body.code).toBe("INVALID_ANSWER_SET");
    const err = result.body.fieldErrors.find((e) => e.code === "unknown_option");
    expect(err).toBeDefined();
  });

  it("rejects a duplicate answer for the same question", () => {
    const result = processScoreRequest({
      questionnaireVersion: "RMP-1.0",
      answers: [
        { questionId: "ER01", optionId: "C" },
        { questionId: "ER01", optionId: "A" },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body.code).toBe("INVALID_ANSWER_SET");
    const err = result.body.fieldErrors.find((e) => e.code === "duplicate_answer");
    expect(err).toBeDefined();
  });
});
