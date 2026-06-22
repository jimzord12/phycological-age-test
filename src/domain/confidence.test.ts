import { describe, expect, it } from "vitest";
import { calculateConfidence } from "./confidence";
import { STRUCTURED_QUESTIONS } from "./questionnaire";
import type { StructuredAnswer } from "./result-types";
import { scoreStructuredAssessment } from "./scoring";

/** Every item answered with option C (all reportable, no inconsistencies). */
function allC(): StructuredAnswer[] {
  return STRUCTURED_QUESTIONS.map((q) => ({ questionId: q.id, optionId: "C" }));
}

function confidenceFor(answers: StructuredAnswer[]) {
  const { dimensions } = scoreStructuredAssessment(answers);
  return calculateConfidence(answers, dimensions);
}

describe("calculateConfidence", () => {
  it("is 100/high for a complete, consistent response set", () => {
    const result = confidenceFor(allC());
    expect(result).toEqual({ score: 100, label: "high", reasons: [] });
  });

  it("deducts 5 for each Not-applicable after the first two", () => {
    const answers = allC().map((a) =>
      ["ER04", "IC04", "PT04"].includes(a.questionId) ? { ...a, optionId: "NA" } : a,
    );
    const result = confidenceFor(answers);
    expect(result.score).toBe(95);
    expect(result.label).toBe("high");
    expect(result.reasons).toContainEqual({
      code: "extra_not_applicable",
      count: 1,
      deducted: 5,
    });
  });

  it("deducts 15 per non-reportable dimension and 10 for low coverage", () => {
    const answers = allC().filter((a) => !a.questionId.startsWith("ER"));
    const result = confidenceFor(answers);
    expect(result.score).toBe(75); // 100 - 15 (ER) - 10 (coverage)
    expect(result.label).toBe("moderate");
    expect(result.reasons).toContainEqual({
      code: "non_reportable_dimension",
      dimension: "ER",
      deducted: 15,
    });
    expect(result.reasons).toContainEqual({ code: "low_coverage", missingOrNa: 5, deducted: 10 });
  });

  it("deducts 5 when a consistency pair differs by more than 75 points", () => {
    // ER01 -> A (score 1), ER05 stays C (score 5): normalized diff = 100.
    const answers = allC().map((a) => (a.questionId === "ER01" ? { ...a, optionId: "A" } : a));
    const result = confidenceFor(answers);
    expect(result.score).toBe(95);
    expect(result.reasons).toContainEqual({
      code: "inconsistent_pair",
      pair: ["ER01", "ER05"],
      deducted: 5,
    });
  });

  it("clamps to 0 for an all Not-applicable response set", () => {
    const answers: StructuredAnswer[] = STRUCTURED_QUESTIONS.map((q) => ({
      questionId: q.id,
      optionId: "NA",
    }));
    const result = confidenceFor(answers);
    expect(result.score).toBe(0);
    expect(result.label).toBe("low");
  });
});
