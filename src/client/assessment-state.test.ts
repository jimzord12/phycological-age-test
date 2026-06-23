import { describe, expect, it } from "vitest";
import {
  assessmentReducer,
  isVersionMismatch,
  makeInitialState,
  type AssessmentState,
} from "./assessment-state";

const V1 = "RMP-1.0";

// ---------------------------------------------------------------------------
// makeInitialState
// ---------------------------------------------------------------------------

describe("makeInitialState", () => {
  it("creates a consent-phase state with the given version", () => {
    const state = makeInitialState(V1);
    expect(state.questionnaireVersion).toBe(V1);
    expect(state.phase).toBe("consent");
    expect(state.stepIndex).toBe(0);
    expect(state.structuredAnswers).toEqual({});
    expect(state.narrativeDrafts).toEqual({});
    expect(state.consent.eligibilityConfirmed).toBe(false);
    expect(state.preferences.includeAiAnalysis).toBe(false);
    expect(state.preferences.includeAgeMetaphor).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isVersionMismatch
// ---------------------------------------------------------------------------

describe("isVersionMismatch", () => {
  it("returns false when versions match", () => {
    expect(isVersionMismatch(makeInitialState(V1), V1)).toBe(false);
  });

  it("returns true when stored version differs", () => {
    expect(isVersionMismatch(makeInitialState("RMP-0.9"), V1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// assessmentReducer
// ---------------------------------------------------------------------------

describe("assessmentReducer", () => {
  const base = makeInitialState(V1);

  it("SET_PHASE updates the phase", () => {
    const next = assessmentReducer(base, { type: "SET_PHASE", phase: "questionnaire" });
    expect(next.phase).toBe("questionnaire");
  });

  it("SET_STEP updates the step index", () => {
    const next = assessmentReducer(base, { type: "SET_STEP", stepIndex: 7 });
    expect(next.stepIndex).toBe(7);
  });

  it("SET_ANSWER adds a structured answer", () => {
    const next = assessmentReducer(base, { type: "SET_ANSWER", questionId: "ER01", optionId: "C" });
    expect(next.structuredAnswers["ER01"]).toBe("C");
  });

  it("SET_ANSWER overwrites an existing answer for the same question", () => {
    const with1 = assessmentReducer(base, {
      type: "SET_ANSWER",
      questionId: "ER01",
      optionId: "C",
    });
    const with2 = assessmentReducer(with1, {
      type: "SET_ANSWER",
      questionId: "ER01",
      optionId: "A",
    });
    expect(with2.structuredAnswers["ER01"]).toBe("A");
  });

  it("SET_ANSWER does not remove other answers", () => {
    const with1 = assessmentReducer(base, {
      type: "SET_ANSWER",
      questionId: "ER01",
      optionId: "C",
    });
    const with2 = assessmentReducer(with1, {
      type: "SET_ANSWER",
      questionId: "IC01",
      optionId: "B",
    });
    expect(with2.structuredAnswers["ER01"]).toBe("C");
    expect(with2.structuredAnswers["IC01"]).toBe("B");
  });

  it("CLEAR_ANSWER removes a specific answer", () => {
    const withAnswer = assessmentReducer(base, {
      type: "SET_ANSWER",
      questionId: "ER01",
      optionId: "C",
    });
    const next = assessmentReducer(withAnswer, { type: "CLEAR_ANSWER", questionId: "ER01" });
    expect(next.structuredAnswers["ER01"]).toBeUndefined();
  });

  it("CLEAR_ANSWER on a missing question is a no-op", () => {
    const next = assessmentReducer(base, { type: "CLEAR_ANSWER", questionId: "UNKNOWN" });
    expect(next.structuredAnswers).toEqual({});
  });

  it("CLEAR_ANSWER does not affect other answers", () => {
    const withTwo = assessmentReducer(
      assessmentReducer(base, { type: "SET_ANSWER", questionId: "ER01", optionId: "C" }),
      { type: "SET_ANSWER", questionId: "IC01", optionId: "B" },
    );
    const next = assessmentReducer(withTwo, { type: "CLEAR_ANSWER", questionId: "ER01" });
    expect(next.structuredAnswers["IC01"]).toBe("B");
  });

  it("SET_NARRATIVE_FIELD stores draft text for an exercise field", () => {
    const next = assessmentReducer(base, {
      type: "SET_NARRATIVE_FIELD",
      exerciseId: "N01",
      fieldId: "event",
      text: "Something happened.",
    });
    expect(next.narrativeDrafts["N01"]?.["event"]).toBe("Something happened.");
  });

  it("SET_NARRATIVE_FIELD merges multiple fields within the same exercise", () => {
    const after1 = assessmentReducer(base, {
      type: "SET_NARRATIVE_FIELD",
      exerciseId: "N01",
      fieldId: "event",
      text: "Event text.",
    });
    const after2 = assessmentReducer(after1, {
      type: "SET_NARRATIVE_FIELD",
      exerciseId: "N01",
      fieldId: "selfStory",
      text: "Self story.",
    });
    expect(after2.narrativeDrafts["N01"]?.["event"]).toBe("Event text.");
    expect(after2.narrativeDrafts["N01"]?.["selfStory"]).toBe("Self story.");
  });

  it("SET_NARRATIVE_FIELD does not affect other exercises", () => {
    const after1 = assessmentReducer(base, {
      type: "SET_NARRATIVE_FIELD",
      exerciseId: "N01",
      fieldId: "event",
      text: "N01 event.",
    });
    const after2 = assessmentReducer(after1, {
      type: "SET_NARRATIVE_FIELD",
      exerciseId: "N02",
      fieldId: "pattern",
      text: "N02 pattern.",
    });
    expect(after2.narrativeDrafts["N01"]?.["event"]).toBe("N01 event.");
    expect(after2.narrativeDrafts["N02"]?.["pattern"]).toBe("N02 pattern.");
  });

  it("SET_CONSENT patches the consent record", () => {
    const next = assessmentReducer(base, {
      type: "SET_CONSENT",
      patch: { eligibilityConfirmed: true },
    });
    expect(next.consent.eligibilityConfirmed).toBe(true);
  });

  it("SET_PREFERENCES patches preferences without clobbering unrelated fields", () => {
    const next = assessmentReducer(base, {
      type: "SET_PREFERENCES",
      patch: { includeAiAnalysis: true },
    });
    expect(next.preferences.includeAiAnalysis).toBe(true);
    expect(next.preferences.includeAgeMetaphor).toBe(false);
  });

  it("RESTORE replaces the entire state", () => {
    const withData = assessmentReducer(base, {
      type: "SET_ANSWER",
      questionId: "ER01",
      optionId: "C",
    });
    const target = makeInitialState("RMP-2.0");
    const next = assessmentReducer(withData, { type: "RESTORE", state: target });
    expect(next.questionnaireVersion).toBe("RMP-2.0");
    expect(next.structuredAnswers).toEqual({});
  });

  it("DISCARD resets to a fresh state with the new version", () => {
    const withData = assessmentReducer(base, {
      type: "SET_ANSWER",
      questionId: "ER01",
      optionId: "C",
    });
    const next = assessmentReducer(withData, { type: "DISCARD", newVersion: "RMP-1.1" });
    expect(next.questionnaireVersion).toBe("RMP-1.1");
    expect(next.structuredAnswers).toEqual({});
    expect(next.phase).toBe("consent");
    expect(next.stepIndex).toBe(0);
  });

  it("reducer does not mutate the input state", () => {
    const frozen = Object.freeze(base) as AssessmentState;
    expect(() => assessmentReducer(frozen, { type: "SET_STEP", stepIndex: 3 })).not.toThrow();
    expect(frozen.stepIndex).toBe(0);
  });
});
