// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getNarrativeStatus, getQuestionStatus, getDimensionSummary } from "./review-screen";
import { NARRATIVE_EXERCISES } from "@/domain/questionnaire";

describe("getQuestionStatus", () => {
  it("returns unanswered when question has no entry", () => {
    expect(getQuestionStatus("ER01", {})).toBe("unanswered");
  });

  it("returns na when optionId is NA", () => {
    expect(getQuestionStatus("ER01", { ER01: "NA" })).toBe("na");
  });

  it("returns answered for option A", () => {
    expect(getQuestionStatus("ER01", { ER01: "A" })).toBe("answered");
  });

  it("returns answered for any non-NA option", () => {
    expect(getQuestionStatus("ER01", { ER01: "E" })).toBe("answered");
  });

  it("does not bleed across question ids", () => {
    expect(getQuestionStatus("ER02", { ER01: "A" })).toBe("unanswered");
  });
});

describe("getDimensionSummary", () => {
  const questions = [{ id: "ER01" }, { id: "ER02" }, { id: "ER03" }];

  it("counts all unanswered when no answers provided", () => {
    expect(getDimensionSummary(questions, {})).toEqual({
      answered: 0,
      na: 0,
      unanswered: 3,
      total: 3,
    });
  });

  it("counts a mix of answered, na, and unanswered", () => {
    expect(getDimensionSummary(questions, { ER01: "B", ER02: "NA" })).toEqual({
      answered: 1,
      na: 1,
      unanswered: 1,
      total: 3,
    });
  });

  it("counts all answered when every question has a non-NA option", () => {
    expect(getDimensionSummary(questions, { ER01: "A", ER02: "B", ER03: "C" })).toEqual({
      answered: 3,
      na: 0,
      unanswered: 0,
      total: 3,
    });
  });

  it("counts all as na when every question chose NA", () => {
    expect(getDimensionSummary(questions, { ER01: "NA", ER02: "NA", ER03: "NA" })).toEqual({
      answered: 0,
      na: 3,
      unanswered: 0,
      total: 3,
    });
  });

  it("handles an empty question list", () => {
    expect(getDimensionSummary([], {})).toEqual({
      answered: 0,
      na: 0,
      unanswered: 0,
      total: 0,
    });
  });
});

describe("getNarrativeStatus", () => {
  const n01 = NARRATIVE_EXERCISES[0]!; // minimumTotalWords: 45
  const n02 = NARRATIVE_EXERCISES[1]!; // minimumTotalWords: 35

  it("returns skipped when no drafts exist for the exercise", () => {
    expect(getNarrativeStatus(n01, {})).toBe("skipped");
  });

  it("returns skipped when all fields are empty strings", () => {
    expect(
      getNarrativeStatus(n01, {
        N01: { event: "", selfStory: "", newUnderstanding: "" },
      }),
    ).toBe("skipped");
  });

  it("returns partial when total words are above zero but below minimum", () => {
    const drafts = {
      N01: { event: "one two three four five", selfStory: "", newUnderstanding: "" },
    };
    expect(getNarrativeStatus(n01, drafts)).toBe("partial");
  });

  it("returns complete when total words exactly meet the minimum", () => {
    const words = Array.from({ length: 45 }, (_, i) => `w${i}`).join(" ");
    const drafts = { N01: { event: words, selfStory: "", newUnderstanding: "" } };
    expect(getNarrativeStatus(n01, drafts)).toBe("complete");
  });

  it("returns complete when total words exceed the minimum", () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ");
    const drafts = { N01: { event: words, selfStory: "", newUnderstanding: "" } };
    expect(getNarrativeStatus(n01, drafts)).toBe("complete");
  });

  it("sums words across all fields of the exercise", () => {
    // 20 words in each of two fields = 40 total; minimum is 45 → partial
    const twenty = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    const drafts = { N01: { event: twenty, selfStory: twenty, newUnderstanding: "" } };
    expect(getNarrativeStatus(n01, drafts)).toBe("partial");
  });

  it("uses the exercise's own minimumTotalWords (N02 has a lower minimum)", () => {
    const words = Array.from({ length: 35 }, (_, i) => `w${i}`).join(" ");
    const drafts = { N02: { pattern: words, contexts: "", unknown: "" } };
    expect(getNarrativeStatus(n02, drafts)).toBe("complete");
  });

  it("ignores drafts for other exercise ids", () => {
    // N01 drafts should not count when checking N02
    const words = Array.from({ length: 45 }, (_, i) => `w${i}`).join(" ");
    const drafts = { N01: { event: words, selfStory: "", newUnderstanding: "" } };
    expect(getNarrativeStatus(n02, drafts)).toBe("skipped");
  });
});
