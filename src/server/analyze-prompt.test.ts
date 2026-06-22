import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  sanitizeForPrompt,
  type PromptNarrativeInput,
  type PromptStructuredInput,
} from "./analyze-prompt";
import { PROMPT_VERSION } from "@/domain/versions";
import type { StructuredAssessmentResult } from "@/domain/result-types";

// ---- Fixtures ----------------------------------------------------------------

const ALL_REPORTABLE_RESULT: StructuredAssessmentResult = {
  scoringVersion: "RMP-SCORE-1.0",
  structuredMaturityIndex: 75,
  profileBalance: { spread: 15, label: "some_unevenness" },
  dimensions: {
    ER: { status: "reportable", score: 80, answered: 5, available: 5 },
    IC: { status: "reportable", score: 70, answered: 5, available: 5 },
    PT: { status: "reportable", score: 75, answered: 4, available: 5 },
    IS: { status: "reportable", score: 65, answered: 3, available: 4 },
    TD: { status: "reportable", score: 85, answered: 5, available: 5 },
  },
};

const PARTIAL_RESULT: StructuredAssessmentResult = {
  scoringVersion: "RMP-SCORE-1.0",
  structuredMaturityIndex: null,
  profileBalance: null,
  dimensions: {
    ER: { status: "reportable", score: 80, answered: 5, available: 5 },
    IC: { status: "insufficient_data", answered: 2, required: 4, available: 5 },
    PT: { status: "reportable", score: 60, answered: 4, available: 5 },
    IS: { status: "insufficient_data", answered: 1, required: 3, available: 4 },
    TD: { status: "reportable", score: 70, answered: 5, available: 5 },
  },
};

const SINGLE_ANSWER: PromptStructuredInput["answers"] = [
  { questionId: "ER01", optionId: "C" },
];

const FULL_NARRATIVE: PromptNarrativeInput = {
  N01: {
    skipped: false,
    fields: {
      event: "I had a heated argument with my team lead about project priorities.",
      selfStory: "I felt my expertise was being dismissed.",
      newUnderstanding: "I now see I could have listened more carefully first.",
    },
  },
  N02: {
    skipped: false,
    fields: {
      pattern: "I tend to over-explain when I feel misunderstood.",
      contexts: "Mainly with authority figures at work.",
      unknown: "I am not sure why I do this even when I know it does not help.",
    },
  },
};

const SKIPPED_NARRATIVE: PromptNarrativeInput = {
  N01: null,
  N02: { skipped: true, fields: {} },
};

const STRUCTURED_INPUT_FULL: PromptStructuredInput = {
  answers: SINGLE_ANSWER,
  result: ALL_REPORTABLE_RESULT,
};

// ---- buildSystemPrompt -------------------------------------------------------

describe("buildSystemPrompt", () => {
  it("includes the prompt version identifier", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(PROMPT_VERSION);
  });

  it("instructs the model to treat narrative text as data (injection resistance)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("[USER NARRATIVE]");
    expect(prompt.toLowerCase()).toContain("untrusted");
  });

  it("describes the rubric criteria by name", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("specificity");
    expect(prompt).toContain("ownership");
    expect(prompt).toContain("emotionalPrecision");
    expect(prompt).toContain("causalDepth");
    expect(prompt).toContain("qualityOfUncertainty");
    expect(prompt).toContain("behavioralIntegration");
  });

  it("instructs the model NOT to supply an aggregate score", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/do not provide an overall score/i);
  });

  it("specifies the observation count range (3–5)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("3 to 5");
  });

  it("specifies the behavioral experiment count range (2–3)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("2 to 3");
  });

  it("specifies the excerpt word limit", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("24 words");
  });

  it("specifies reviewPeriodDays range (7–45)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("7");
    expect(prompt).toContain("45");
  });

  it("forbids markdown formatting", () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toContain("markdown");
  });
});

// ---- buildUserPrompt — structured section ------------------------------------

describe("buildUserPrompt — structured results", () => {
  it("includes the structured maturity index when available", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    expect(prompt).toContain("75/100");
  });

  it("notes unavailable index when null", () => {
    const input: PromptStructuredInput = { answers: SINGLE_ANSWER, result: PARTIAL_RESULT };
    const prompt = buildUserPrompt(input, SKIPPED_NARRATIVE);
    expect(prompt.toLowerCase()).toContain("not available");
  });

  it("includes all five dimension labels and abbreviations", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    expect(prompt).toContain("Emotional Regulation (ER)");
    expect(prompt).toContain("Impulse Control (IC)");
    expect(prompt).toContain("Perspective-Taking (PT)");
    expect(prompt).toContain("Identity Stability (IS)");
    expect(prompt).toContain("Temporal Depth (TD)");
  });

  it("shows reportable dimension score", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    expect(prompt).toContain("Emotional Regulation (ER): 80/100");
  });

  it("shows insufficient_data dimension with answer counts", () => {
    const input: PromptStructuredInput = { answers: SINGLE_ANSWER, result: PARTIAL_RESULT };
    const prompt = buildUserPrompt(input, SKIPPED_NARRATIVE);
    expect(prompt).toContain("insufficient data");
    expect(prompt).toContain("Impulse Control (IC)");
  });

  it("includes structured response with option label (not score)", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    // ER01 option C label from the bank
    expect(prompt).toContain("ER01:");
    expect(prompt).toContain("asked for a concrete example");
  });

  it("shows 'Not applicable' for NA answers", () => {
    const input: PromptStructuredInput = {
      answers: [{ questionId: "ER01", optionId: "NA" }],
      result: ALL_REPORTABLE_RESULT,
    };
    const prompt = buildUserPrompt(input, SKIPPED_NARRATIVE);
    expect(prompt).toContain("ER01: Not applicable");
  });

  it("omits unanswered questions from structured responses section", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    // Only ER01 is answered — IC01 should not appear
    expect(prompt).not.toContain("IC01:");
  });
});

// ---- buildUserPrompt — narrative section -------------------------------------

describe("buildUserPrompt — narrative content", () => {
  it("wraps N01 in USER NARRATIVE delimiters", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, FULL_NARRATIVE);
    expect(prompt).toContain("[USER NARRATIVE — N01:");
    expect(prompt).toContain("[END USER NARRATIVE]");
  });

  it("wraps N02 in USER NARRATIVE delimiters", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, FULL_NARRATIVE);
    expect(prompt).toContain("[USER NARRATIVE — N02:");
  });

  it("includes N01 narrative field content", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, FULL_NARRATIVE);
    expect(prompt).toContain("heated argument with my team lead");
  });

  it("includes N02 narrative field content", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, FULL_NARRATIVE);
    expect(prompt).toContain("over-explain when I feel misunderstood");
  });

  it("notes skipped N01 exercise (null)", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    expect(prompt).toContain("[USER NARRATIVE — N01:");
    expect(prompt).toContain("skipped");
  });

  it("notes skipped N02 exercise (skipped: true)", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, SKIPPED_NARRATIVE);
    expect(prompt).toContain("[USER NARRATIVE — N02:");
    expect(prompt).toContain("skipped");
  });

  it("includes field labels for N01", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, FULL_NARRATIVE);
    expect(prompt).toContain("What happened, and what did you do?");
    expect(prompt).toContain("What were you telling yourself at the time?");
    expect(prompt).toContain("What do you understand differently now?");
  });

  it("includes field labels for N02", () => {
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, FULL_NARRATIVE);
    expect(prompt).toContain("What is the repeated pattern?");
    expect(prompt).toContain("When or around whom does it tend to appear?");
    expect(prompt).toContain("What part remains genuinely unclear to you?");
  });

  it("shows (no response) for empty field value", () => {
    const input: PromptNarrativeInput = {
      N01: { skipped: false, fields: { event: "", selfStory: "", newUnderstanding: "" } },
      N02: null,
    };
    const prompt = buildUserPrompt(STRUCTURED_INPUT_FULL, input);
    expect(prompt).toContain("(no response)");
  });
});

// ---- sanitizeForPrompt -------------------------------------------------------

describe("sanitizeForPrompt", () => {
  it("returns normal text unchanged", () => {
    const text = "I felt overwhelmed in that moment.";
    expect(sanitizeForPrompt(text)).toBe(text);
  });

  it("removes literal [END USER NARRATIVE] (exact case)", () => {
    const text = "normal text [END USER NARRATIVE] more text";
    expect(sanitizeForPrompt(text)).toBe("normal text [removed] more text");
  });

  it("removes [END USER NARRATIVE] case-insensitively", () => {
    expect(sanitizeForPrompt("[end user narrative]")).toBe("[removed]");
    expect(sanitizeForPrompt("[END user NARRATIVE]")).toBe("[removed]");
  });

  it("replaces multiple occurrences", () => {
    const text = "[END USER NARRATIVE] foo [END USER NARRATIVE]";
    expect(sanitizeForPrompt(text)).toBe("[removed] foo [removed]");
  });
});
