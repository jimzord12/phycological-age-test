import { describe, expect, it } from "vitest";
import {
  narrativeBack,
  narrativeContinue,
  NARRATIVE_VISUAL_STEPS,
} from "./_narrative-shell";

// ---------------------------------------------------------------------------
// NARRATIVE_VISUAL_STEPS
// ---------------------------------------------------------------------------

describe("NARRATIVE_VISUAL_STEPS", () => {
  it("N01 is visual step 9", () => {
    expect(NARRATIVE_VISUAL_STEPS[0]).toBe(9);
  });

  it("N02 is visual step 16", () => {
    expect(NARRATIVE_VISUAL_STEPS[1]).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// narrativeBack
// ---------------------------------------------------------------------------

describe("narrativeBack", () => {
  it("returns to structured item 7 (last before N01) when on N01", () => {
    expect(narrativeBack(0)).toEqual({ phase: "questionnaire", stepIndex: 7 });
  });

  it("returns to structured item 13 (last before N02) when on N02", () => {
    expect(narrativeBack(1)).toEqual({ phase: "questionnaire", stepIndex: 13 });
  });
});

// ---------------------------------------------------------------------------
// narrativeContinue
// ---------------------------------------------------------------------------

describe("narrativeContinue", () => {
  it("advances to structured item 8 (first after N01) from N01", () => {
    expect(narrativeContinue(0)).toEqual({ phase: "questionnaire", stepIndex: 8 });
  });

  it("transitions to the review screen from N02", () => {
    expect(narrativeContinue(1)).toEqual({ phase: "review", stepIndex: 0 });
  });
});

// ---------------------------------------------------------------------------
// Navigation symmetry: questionnaire shell ↔ narrative shell
// ---------------------------------------------------------------------------

describe("narrative ↔ questionnaire navigation symmetry", () => {
  it("narrativeBack(0) target matches the item that nextOnContinue routes to N01", () => {
    // questionnaire index 7 → nextOnContinue(7) → narrative/0
    // narrative/0 → narrativeBack(0) → questionnaire/7
    expect(narrativeBack(0)).toEqual({ phase: "questionnaire", stepIndex: 7 });
  });

  it("narrativeContinue(0) target matches the item that nextOnBack routes back to N01", () => {
    // questionnaire index 8 → nextOnBack(8) → narrative/0
    // narrative/0 → narrativeContinue(0) → questionnaire/8
    expect(narrativeContinue(0)).toEqual({ phase: "questionnaire", stepIndex: 8 });
  });

  it("narrativeBack(1) target matches the item that nextOnContinue routes to N02", () => {
    // questionnaire index 13 → nextOnContinue(13) → narrative/1
    // narrative/1 → narrativeBack(1) → questionnaire/13
    expect(narrativeBack(1)).toEqual({ phase: "questionnaire", stepIndex: 13 });
  });

  it("narrativeContinue(1) target matches the item that nextOnBack routes back to N02", () => {
    // questionnaire index 14 → nextOnBack(14) → narrative/1
    // narrative/1 → narrativeContinue(1) → review/0
    expect(narrativeContinue(1)).toEqual({ phase: "review", stepIndex: 0 });
  });
});
