import { describe, expect, it } from "vitest";
import { nextOnBack, nextOnContinue, toVisualStep } from "./_questionnaire-shell";

// ---------------------------------------------------------------------------
// toVisualStep
// ---------------------------------------------------------------------------

describe("toVisualStep", () => {
  it("maps indices 0–7 to visual steps 1–8", () => {
    for (let i = 0; i < 8; i++) {
      expect(toVisualStep(i)).toBe(i + 1);
    }
  });

  it("maps indices 8–13 to visual steps 10–15 (step 9 reserved for N01)", () => {
    for (let i = 8; i < 14; i++) {
      expect(toVisualStep(i)).toBe(i + 2);
    }
  });

  it("maps indices 14–23 to visual steps 17–26 (steps 9 and 16 reserved for narratives)", () => {
    for (let i = 14; i < 24; i++) {
      expect(toVisualStep(i)).toBe(i + 3);
    }
  });

  it("first and last structured questions map to steps 1 and 26", () => {
    expect(toVisualStep(0)).toBe(1);
    expect(toVisualStep(23)).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// nextOnContinue
// ---------------------------------------------------------------------------

describe("nextOnContinue", () => {
  it("advances to the next question within the same phase for indices 0–6", () => {
    for (let i = 0; i < 7; i++) {
      const target = nextOnContinue(i);
      expect(target).toEqual({ phase: "questionnaire", stepIndex: i + 1 });
    }
  });

  it("transitions to narrative N01 after item 8 (index 7)", () => {
    expect(nextOnContinue(7)).toEqual({ phase: "narrative", stepIndex: 0 });
  });

  it("advances within questionnaire for indices 8–12", () => {
    for (let i = 8; i < 13; i++) {
      const target = nextOnContinue(i);
      expect(target).toEqual({ phase: "questionnaire", stepIndex: i + 1 });
    }
  });

  it("transitions to narrative N02 after item 14 (index 13)", () => {
    expect(nextOnContinue(13)).toEqual({ phase: "narrative", stepIndex: 1 });
  });

  it("advances within questionnaire for indices 14–22", () => {
    for (let i = 14; i < 23; i++) {
      const target = nextOnContinue(i);
      expect(target).toEqual({ phase: "questionnaire", stepIndex: i + 1 });
    }
  });

  it("transitions to review after the final item (index 23)", () => {
    expect(nextOnContinue(23)).toEqual({ phase: "review", stepIndex: 0 });
  });
});

// ---------------------------------------------------------------------------
// nextOnBack
// ---------------------------------------------------------------------------

describe("nextOnBack", () => {
  it("returns to consent step 1 from the first question (index 0)", () => {
    expect(nextOnBack(0)).toEqual({ phase: "consent", stepIndex: 1 });
  });

  it("returns to previous question within questionnaire for indices 1–7", () => {
    for (let i = 1; i < 8; i++) {
      expect(nextOnBack(i)).toEqual({ phase: "questionnaire", stepIndex: i - 1 });
    }
  });

  it("returns to narrative N01 from index 8", () => {
    expect(nextOnBack(8)).toEqual({ phase: "narrative", stepIndex: 0 });
  });

  it("returns to previous question for indices 9–13", () => {
    for (let i = 9; i < 14; i++) {
      expect(nextOnBack(i)).toEqual({ phase: "questionnaire", stepIndex: i - 1 });
    }
  });

  it("returns to narrative N02 from index 14", () => {
    expect(nextOnBack(14)).toEqual({ phase: "narrative", stepIndex: 1 });
  });

  it("returns to previous question for indices 15–23", () => {
    for (let i = 15; i < 24; i++) {
      expect(nextOnBack(i)).toEqual({ phase: "questionnaire", stepIndex: i - 1 });
    }
  });
});
