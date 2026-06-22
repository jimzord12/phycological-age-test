import { describe, expect, it } from "vitest";
import {
  calculateNarrativeScore,
  classifyExerciseContent,
  countWords,
  fieldsOverCap,
  type NarrativeContent,
  narrativeConfidence,
  totalWords,
} from "./narrative-rubric";
import type { NarrativeRubricScores } from "./result-types";

const FULL_RUBRIC: NarrativeRubricScores = {
  specificity: 2,
  ownership: 2,
  emotionalPrecision: 2,
  causalDepth: 2,
  qualityOfUncertainty: 2,
  behavioralIntegration: 2,
};

function words(n: number): string {
  return Array.from({ length: n }, () => "word").join(" ");
}

describe("countWords / totalWords", () => {
  it("counts whitespace-separated tokens deterministically", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  a\tb\nc  ")).toBe(3);
  });

  it("sums across fields", () => {
    expect(totalWords({ a: "one two", b: "three", c: "" })).toBe(3);
  });
});

describe("fieldsOverCap", () => {
  it("flags fields exceeding the canonical hard cap (N01 event = 90)", () => {
    expect(fieldsOverCap("N01", { event: words(91) })).toEqual(["event"]);
    expect(fieldsOverCap("N01", { event: words(90) })).toEqual([]);
  });
});

describe("classifyExerciseContent", () => {
  it("classifies against the minimum-word threshold", () => {
    expect(classifyExerciseContent("N01", { a: words(45) }, false)).toBe("meets_threshold");
    expect(classifyExerciseContent("N01", { a: words(44) }, false)).toBe("meaningful");
    expect(classifyExerciseContent("N01", { a: "" }, false)).toBe("empty");
    expect(classifyExerciseContent("N02", { a: words(35) }, false)).toBe("meets_threshold");
    expect(classifyExerciseContent("N02", { a: words(34) }, false)).toBe("meaningful");
  });

  it("treats a skipped exercise as empty", () => {
    expect(classifyExerciseContent("N01", { a: words(99) }, true)).toBe("empty");
  });
});

describe("narrativeConfidence", () => {
  const cases: Array<[NarrativeContent, string]> = [
    [{ N01: "meets_threshold", N02: "meets_threshold" }, "high"],
    [{ N01: "meets_threshold", N02: "meaningful" }, "moderate"],
    [{ N01: "meets_threshold", N02: "empty" }, "moderate"],
    [{ N01: "meaningful", N02: "empty" }, "low"],
    [{ N01: "empty", N02: "empty" }, "not_available"],
  ];
  it.each(cases)("maps %o -> %s", (content, expected) => {
    expect(narrativeConfidence(content)).toBe(expected);
  });
});

describe("calculateNarrativeScore", () => {
  it("scores both-met content with the full rubric as 100", () => {
    const result = calculateNarrativeScore(FULL_RUBRIC, 0, {
      N01: "meets_threshold",
      N02: "meets_threshold",
    });
    expect(result).toMatchObject({ status: "scored", score: 100, confidence: "high" });
  });

  it("applies the performative-abstraction penalty (DOMAIN §10.4)", () => {
    // positive_total = 6, penalty 2 -> adjusted 4 -> round(4/12*100) = 33.
    const rubric: NarrativeRubricScores = {
      specificity: 1,
      ownership: 1,
      emotionalPrecision: 1,
      causalDepth: 1,
      qualityOfUncertainty: 1,
      behavioralIntegration: 1,
    };
    const result = calculateNarrativeScore(rubric, 2, {
      N01: "meets_threshold",
      N02: "meets_threshold",
    });
    expect(result).toMatchObject({ status: "scored", score: 33 });
  });

  it("floors the adjusted total at zero", () => {
    const rubric: NarrativeRubricScores = {
      specificity: 1,
      ownership: 0,
      emotionalPrecision: 0,
      causalDepth: 0,
      qualityOfUncertainty: 0,
      behavioralIntegration: 0,
    };
    const result = calculateNarrativeScore(rubric, 2, {
      N01: "meets_threshold",
      N02: "meets_threshold",
    });
    expect(result).toMatchObject({ status: "scored", score: 0 });
  });

  it("rounds at the formula point", () => {
    // positive_total = 7, penalty 0 -> 7/12*100 = 58.33 -> 58.
    const rubric: NarrativeRubricScores = {
      specificity: 2,
      ownership: 2,
      emotionalPrecision: 1,
      causalDepth: 1,
      qualityOfUncertainty: 1,
      behavioralIntegration: 0,
    };
    const result = calculateNarrativeScore(rubric, 0, {
      N01: "meets_threshold",
      N02: "meets_threshold",
    });
    expect(result).toMatchObject({ status: "scored", score: 58 });
  });

  it("labels limited_evidence when only one exercise meets its threshold", () => {
    const result = calculateNarrativeScore(FULL_RUBRIC, 0, {
      N01: "meets_threshold",
      N02: "meaningful",
    });
    expect(result).toMatchObject({ status: "limited_evidence", confidence: "moderate" });
  });

  it("returns not_scored when neither exercise meets its threshold", () => {
    expect(calculateNarrativeScore(FULL_RUBRIC, 0, { N01: "meaningful", N02: "empty" })).toEqual({
      status: "not_scored",
    });
    expect(calculateNarrativeScore(FULL_RUBRIC, 0, { N01: "empty", N02: "empty" })).toEqual({
      status: "not_scored",
    });
  });
});
