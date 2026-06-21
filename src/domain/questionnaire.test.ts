import { describe, expect, it } from "vitest";
import {
  getOptionScore,
  getPublicQuestionnaire,
  NARRATIVE_EXERCISES,
  questionsForDimension,
  STRUCTURED_QUESTIONS,
} from "./questionnaire";
import { DIMENSION_IDS } from "./result-types";

/** Canonical A–E score maps reproduced from DOMAIN §7 for an independent check. */
const EXPECTED_SCORES: Record<string, [number, number, number, number, number]> = {
  ER01: [1, 2, 5, 2, 4],
  ER02: [1, 2, 5, 3, 4],
  ER03: [3, 5, 3, 1, 2],
  ER04: [2, 1, 5, 2, 4],
  ER05: [4, 1, 5, 2, 3],
  IC01: [1, 4, 5, 2, 3],
  IC02: [1, 2, 5, 4, 3],
  IC03: [1, 2, 5, 4, 2],
  IC04: [1, 2, 5, 4, 2],
  IC05: [1, 2, 5, 2, 4],
  PT01: [1, 2, 5, 2, 4],
  PT02: [1, 2, 5, 4, 2],
  PT03: [1, 2, 5, 4, 3],
  PT04: [1, 2, 5, 3, 4],
  PT05: [1, 2, 5, 3, 4],
  IS01: [1, 2, 5, 4, 3],
  IS02: [1, 2, 5, 2, 4],
  IS03: [1, 2, 5, 4, 2],
  IS04: [1, 2, 5, 4, 2],
  TD01: [1, 2, 5, 3, 4],
  TD02: [1, 2, 5, 4, 2],
  TD03: [1, 2, 5, 4, 3],
  TD04: [2, 2, 5, 1, 4],
  TD05: [1, 3, 5, 2, 4],
};

describe("canonical question bank (RMP-1.0)", () => {
  it("contains exactly 24 structured questions", () => {
    expect(STRUCTURED_QUESTIONS).toHaveLength(24);
  });

  it("has the canonical dimension distribution", () => {
    const counts = Object.fromEntries(
      DIMENSION_IDS.map((d) => [d, questionsForDimension(d).length]),
    );
    expect(counts).toEqual({ ER: 5, IC: 5, PT: 5, IS: 4, TD: 5 });
  });

  it("gives every item five scored options plus a Not-applicable option", () => {
    for (const question of STRUCTURED_QUESTIONS) {
      expect(question.options).toHaveLength(6);
      const scored = question.options.filter((o) => o.score !== null);
      expect(scored).toHaveLength(5);
      const na = question.options.find((o) => o.isNotApplicable);
      expect(na).toBeDefined();
      expect(na?.score).toBeNull();
    }
  });

  it("matches every canonical option score (DOMAIN §7)", () => {
    for (const [questionId, [a, b, c, d, e]] of Object.entries(EXPECTED_SCORES)) {
      expect(getOptionScore(questionId, "A")).toBe(a);
      expect(getOptionScore(questionId, "B")).toBe(b);
      expect(getOptionScore(questionId, "C")).toBe(c);
      expect(getOptionScore(questionId, "D")).toBe(d);
      expect(getOptionScore(questionId, "E")).toBe(e);
      expect(getOptionScore(questionId, "NA")).toBeNull();
    }
  });

  it("covers every question in the expected score table", () => {
    expect(Object.keys(EXPECTED_SCORES).sort()).toEqual(
      STRUCTURED_QUESTIONS.map((q) => q.id).sort(),
    );
  });
});

describe("narrative exercises", () => {
  it("defines two exercises with canonical thresholds and field caps", () => {
    expect(NARRATIVE_EXERCISES.map((e) => e.id)).toEqual(["N01", "N02"]);
    const n01 = NARRATIVE_EXERCISES[0]!;
    const n02 = NARRATIVE_EXERCISES[1]!;
    expect(n01.minimumTotalWords).toBe(45);
    expect(n01.fields.map((f) => f.maxWords)).toEqual([90, 60, 90]);
    expect(n02.minimumTotalWords).toBe(35);
    expect(n02.fields.map((f) => f.maxWords)).toEqual([70, 50, 70]);
  });
});

describe("public questionnaire projection", () => {
  it("never exposes numeric option scores (PRD §14.1)", () => {
    const projection = getPublicQuestionnaire();
    const serialized = JSON.stringify(projection.structured);
    for (const question of projection.structured) {
      for (const option of question.options) {
        expect("score" in option).toBe(false);
      }
    }
    // The strings "score":1.. must not appear anywhere in the projection.
    expect(serialized).not.toMatch(/"score"\s*:/);
  });
});
