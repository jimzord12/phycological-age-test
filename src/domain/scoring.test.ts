import { describe, expect, it } from "vitest";
import { STRUCTURED_QUESTIONS, type StructuredQuestion } from "./questionnaire";
import type { DimensionId, DimensionResult, StructuredAnswer } from "./result-types";
import {
  calculateAgeMetaphor,
  calculateProfileBalance,
  normalizeItemScore,
  scoreDimension,
  scoreStructuredAssessment,
  validateAnswerSet,
} from "./scoring";

const VERSION = "RMP-1.0";

function optionWithScore(question: StructuredQuestion, target: number): string {
  const option = question.options.find((o) => o.score === target);
  if (!option) throw new Error(`no option scoring ${target} for ${question.id}`);
  return option.id;
}

/** Build a full answer set where every item resolves to the given score. */
function answersWithScore(score: number): StructuredAnswer[] {
  return STRUCTURED_QUESTIONS.map((q) => ({
    questionId: q.id,
    optionId: optionWithScore(q, score),
  }));
}

function answersForDimension(dimension: DimensionId, optionIds: string[]): StructuredAnswer[] {
  const questions = STRUCTURED_QUESTIONS.filter((q) => q.dimension === dimension);
  return optionIds.map((optionId, i) => ({ questionId: questions[i]!.id, optionId }));
}

describe("normalizeItemScore", () => {
  it("maps 1..5 onto 0..100", () => {
    expect(normalizeItemScore(1)).toBe(0);
    expect(normalizeItemScore(2)).toBe(25);
    expect(normalizeItemScore(3)).toBe(50);
    expect(normalizeItemScore(4)).toBe(75);
    expect(normalizeItemScore(5)).toBe(100);
  });
});

describe("scoreDimension", () => {
  it("normalizes the mean of answered items (DOMAIN §9.2)", () => {
    // ER, all five answered with score 5 -> 100 (ER02 C=5, ER03 B=5).
    const all5 = answersForDimension("ER", ["C", "C", "B", "C", "C"]);
    const result = scoreDimension("ER", all5);
    expect(result).toMatchObject({ status: "reportable", score: 100, answered: 5, available: 5 });
  });

  it("excludes Not-applicable from the denominator", () => {
    // ER: four scored 5, one NA -> still reportable, score 100, answered 4.
    const answers = answersForDimension("ER", ["C", "C", "B", "C", "NA"]);
    const result = scoreDimension("ER", answers);
    expect(result).toMatchObject({ status: "reportable", score: 100, answered: 4 });
  });

  it("returns insufficient_data below the threshold for a 5-item dimension", () => {
    const answers = answersForDimension("ER", ["C", "C", "B"]); // only 3 scored
    expect(scoreDimension("ER", answers)).toEqual({
      status: "insufficient_data",
      answered: 3,
      required: 4,
      available: 5,
    });
  });

  it("uses the lower threshold of 3 for Identity Stability (4 items)", () => {
    const three = answersForDimension("IS", ["C", "C", "C"]);
    expect(scoreDimension("IS", three)).toMatchObject({ status: "reportable", answered: 3 });
    const two = answersForDimension("IS", ["C", "C"]);
    expect(scoreDimension("IS", two)).toEqual({
      status: "insufficient_data",
      answered: 2,
      required: 3,
      available: 4,
    });
  });

  it("treats two NA in a 4-item dimension as insufficient", () => {
    const answers = answersForDimension("IS", ["C", "C", "NA", "NA"]);
    expect(scoreDimension("IS", answers)).toMatchObject({
      status: "insufficient_data",
      answered: 2,
    });
  });
});

describe("scoreStructuredAssessment", () => {
  it("produces SMI 100 when every item is at the maximum", () => {
    const result = scoreStructuredAssessment(answersWithScore(5));
    expect(result.structuredMaturityIndex).toBe(100);
    expect(result.profileBalance).toEqual({ spread: 0, label: "relatively_balanced" });
    for (const d of Object.values(result.dimensions)) {
      expect(d).toMatchObject({ status: "reportable", score: 100 });
    }
  });

  it("produces SMI 0 when every item is at the minimum", () => {
    const result = scoreStructuredAssessment(answersWithScore(1));
    expect(result.structuredMaturityIndex).toBe(0);
  });

  it("weights dimensions equally despite IS having four items (DOMAIN §6.2)", () => {
    // ER -> 100, all other dimensions -> 0. SMI must be (100+0+0+0+0)/5 = 20.
    // TD04 A=2, so use D (=1) there to keep TD at the minimum.
    const answers: StructuredAnswer[] = [
      ...answersForDimension("ER", ["C", "C", "B", "C", "C"]), // 100
      ...answersForDimension("IC", ["A", "A", "A", "A", "A"]), // 0
      ...answersForDimension("PT", ["A", "A", "A", "A", "A"]), // 0
      ...answersForDimension("IS", ["A", "A", "A", "A"]), // 0
      ...answersForDimension("TD", ["A", "A", "A", "D", "A"]), // 0
    ];
    const result = scoreStructuredAssessment(answers);
    expect(result.dimensions.ER).toMatchObject({ status: "reportable", score: 100 });
    expect(result.dimensions.TD).toMatchObject({ status: "reportable", score: 0 });
    expect(result.structuredMaturityIndex).toBe(20);
  });

  it("returns a null index when any dimension is insufficient", () => {
    const answers = answersWithScore(5).filter((a) => !a.questionId.startsWith("ER"));
    const result = scoreStructuredAssessment(answers);
    expect(result.dimensions.ER.status).toBe("insufficient_data");
    expect(result.structuredMaturityIndex).toBeNull();
  });
});

describe("calculateProfileBalance", () => {
  function dims(values: Partial<Record<DimensionId, number>>): Record<DimensionId, DimensionResult> {
    const base = {} as Record<DimensionId, DimensionResult>;
    for (const d of ["ER", "IC", "PT", "IS", "TD"] as DimensionId[]) {
      const score = values[d];
      base[d] =
        score === undefined
          ? { status: "insufficient_data", answered: 0, required: 4, available: 5 }
          : { status: "reportable", score, answered: 5, available: 5 };
    }
    return base;
  }

  it("labels spread bands per DOMAIN §9.4", () => {
    expect(calculateProfileBalance(dims({ ER: 50, IC: 60, PT: 64, IS: 50, TD: 55 }))).toEqual({
      spread: 14,
      label: "relatively_balanced",
    });
    expect(calculateProfileBalance(dims({ ER: 50, IC: 60, PT: 65, IS: 50, TD: 55 }))).toEqual({
      spread: 15,
      label: "some_unevenness",
    });
    expect(calculateProfileBalance(dims({ ER: 40, IC: 60, PT: 70, IS: 50, TD: 55 }))).toEqual({
      spread: 30,
      label: "strongly_uneven",
    });
  });

  it("ignores insufficient dimensions and returns null when none are reportable", () => {
    expect(calculateProfileBalance(dims({ ER: 80, IC: 90 }))).toEqual({
      spread: 10,
      label: "relatively_balanced",
    });
    expect(calculateProfileBalance(dims({}))).toBeNull();
  });
});

describe("calculateAgeMetaphor", () => {
  it("maps the index onto the 16–72 scale only when enabled (DOMAIN §9.5)", () => {
    expect(calculateAgeMetaphor(0, true)).toBe(16);
    expect(calculateAgeMetaphor(50, true)).toBe(44);
    expect(calculateAgeMetaphor(100, true)).toBe(72);
  });

  it("returns null when disabled or when the index is unavailable", () => {
    expect(calculateAgeMetaphor(68, false)).toBeNull();
    expect(calculateAgeMetaphor(null, true)).toBeNull();
  });
});

describe("validateAnswerSet", () => {
  it("accepts a valid set", () => {
    const result = validateAnswerSet(VERSION, [{ questionId: "ER01", optionId: "C" }]);
    expect(result.ok).toBe(true);
  });

  it("rejects a version mismatch", () => {
    const result = validateAnswerSet("RMP-0.9", [{ questionId: "ER01", optionId: "C" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "version_mismatch",
        expected: "RMP-1.0",
        received: "RMP-0.9",
      });
    }
  });

  it("rejects unknown questions, unknown options and duplicates", () => {
    const result = validateAnswerSet(VERSION, [
      { questionId: "ZZ99", optionId: "C" },
      { questionId: "ER01", optionId: "Z" },
      { questionId: "ER02", optionId: "C" },
      { questionId: "ER02", optionId: "B" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "unknown_question", questionId: "ZZ99" });
      expect(result.errors).toContainEqual({
        code: "unknown_option",
        questionId: "ER01",
        optionId: "Z",
      });
      expect(result.errors).toContainEqual({ code: "duplicate_answer", questionId: "ER02" });
    }
  });
});
