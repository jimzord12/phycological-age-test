// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { makeInitialState } from "./assessment-state";
import {
  clearAssessmentDraft,
  loadAssessmentDraft,
  saveAssessmentDraft,
  STORAGE_KEY,
} from "./storage";

const V1 = "RMP-1.0";

afterEach(() => {
  window.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// saveAssessmentDraft / loadAssessmentDraft round-trip
// ---------------------------------------------------------------------------

describe("saveAssessmentDraft / loadAssessmentDraft", () => {
  it("round-trips a minimal draft through sessionStorage", () => {
    const state = makeInitialState(V1);
    saveAssessmentDraft(state);
    expect(loadAssessmentDraft()).toEqual(state);
  });

  it("round-trips a draft with structured answers", () => {
    const state = makeInitialState(V1);
    state.structuredAnswers["ER01"] = "C";
    state.structuredAnswers["IC01"] = "B";
    saveAssessmentDraft(state);
    const loaded = loadAssessmentDraft();
    expect(loaded?.structuredAnswers["ER01"]).toBe("C");
    expect(loaded?.structuredAnswers["IC01"]).toBe("B");
  });

  it("round-trips narrative drafts through sessionStorage (not localStorage)", () => {
    const state = makeInitialState(V1);
    state.narrativeDrafts["N01"] = { event: "A real situation." };
    saveAssessmentDraft(state);
    const loaded = loadAssessmentDraft();
    expect(loaded?.narrativeDrafts["N01"]?.["event"]).toBe("A real situation.");
  });

  it("returns null when sessionStorage is empty", () => {
    expect(loadAssessmentDraft()).toBeNull();
  });

  it("returns null when stored JSON is not parseable", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "not-valid-json{{");
    expect(loadAssessmentDraft()).toBeNull();
  });

  it("returns null when stored JSON has wrong shape", () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ wrong: "shape" }));
    expect(loadAssessmentDraft()).toBeNull();
  });

  it("returns null when stored JSON is missing required fields", () => {
    const partial = { questionnaireVersion: V1, phase: "consent" };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(partial));
    expect(loadAssessmentDraft()).toBeNull();
  });

  it("uses sessionStorage, not localStorage — localStorage stays empty", () => {
    saveAssessmentDraft(makeInitialState(V1));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("overwrites a previous draft on a second save", () => {
    const first = makeInitialState(V1);
    saveAssessmentDraft(first);

    const second = makeInitialState(V1);
    second.stepIndex = 5;
    saveAssessmentDraft(second);

    const loaded = loadAssessmentDraft();
    expect(loaded?.stepIndex).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// clearAssessmentDraft
// ---------------------------------------------------------------------------

describe("clearAssessmentDraft", () => {
  it("removes the draft from sessionStorage", () => {
    saveAssessmentDraft(makeInitialState(V1));
    clearAssessmentDraft();
    expect(loadAssessmentDraft()).toBeNull();
  });

  it("is a no-op when sessionStorage is already empty", () => {
    expect(() => clearAssessmentDraft()).not.toThrow();
  });
});
