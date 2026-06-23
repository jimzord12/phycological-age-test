import { describe, it, expect, vi, beforeEach } from "vitest";
import { STRUCTURED_QUESTIONS } from "@/domain/questionnaire";
import type { DimensionId } from "@/domain/result-types";

// Mock the AI provider and safety service before importing the route.
vi.mock("@/server/ai-provider", () => ({ analyze: vi.fn() }));
vi.mock("@/server/safety-service", () => ({ classifySafety: vi.fn() }));

const { processAnalyzeRequest } = await import("./route");
const { analyze } = await import("@/server/ai-provider");
const { classifySafety } = await import("@/server/safety-service");
const mockAnalyze = vi.mocked(analyze);
const mockClassifySafety = vi.mocked(classifySafety);

// ---- Fixtures ----------------------------------------------------------------

function optionWithScore(questionId: string, target: number): string {
  const question = STRUCTURED_QUESTIONS.find((q) => q.id === questionId);
  if (!question) throw new Error(`unknown question ${questionId}`);
  const option = question.options.find((o) => o.score === target);
  if (!option) throw new Error(`no option scoring ${target} for ${questionId}`);
  return option.id;
}

function fullAnswerSet(): Array<{ questionId: string; optionId: string }> {
  return STRUCTURED_QUESTIONS.map((q) => ({
    questionId: q.id,
    optionId: optionWithScore(q.id, 5),
  }));
}

function dimensionAnswers(
  dimension: DimensionId,
  optionIds: string[],
): Array<{ questionId: string; optionId: string }> {
  const questions = STRUCTURED_QUESTIONS.filter((q) => q.dimension === dimension);
  return optionIds.map((optionId, i) => ({ questionId: questions[i]!.id, optionId }));
}

// N01 threshold is 45 total words; these three fields total ~50 words.
const N01_CONTENT = {
  skipped: false,
  fields: {
    event:
      "Last month I disagreed with my manager about how to prioritize the project work. I reacted by immediately arguing my case.",
    selfStory: "I felt my judgment was being ignored and I needed to prove my point was right.",
    newUnderstanding:
      "I now see that I could have asked more questions before defending my position so strongly.",
  },
};

// N02 threshold is 35 total words; these three fields total ~39 words.
const N02_CONTENT = {
  skipped: false,
  fields: {
    pattern: "I avoid sharing my real opinion when I think others might strongly disagree with me.",
    contexts: "Mostly at work with senior colleagues or in group settings.",
    unknown: "I am not sure if this is about fear of conflict or something else entirely.",
  },
};

const VALID_REQUEST = {
  questionnaireVersion: "RMP-1.0",
  answers: fullAnswerSet(),
  preferences: { aiConsent: true },
  narrative: { N01: N01_CONTENT, N02: N02_CONTENT },
};

const VALID_AI_OUTPUT = {
  status: "completed" as const,
  output: {
    observations: [
      { text: "Shows strong self-regulation.", evidence: "ER01" },
      { text: "Demonstrates ownership.", evidence: "IC02" },
      { text: "Reflects on patterns thoughtfully.", evidence: "N01 excerpt" },
    ],
    behavioralExperiments: [
      { text: "Pause three seconds before responding in disagreements." },
      { text: "Write down one question to ask before defending your position." },
    ],
    excerpt: "Thoughtful self-reflection with emerging behavioral awareness.",
    reviewPeriodDays: 21,
    rubric: {
      specificity: 1 as const,
      ownership: 2 as const,
      emotionalPrecision: 1 as const,
      causalDepth: 1 as const,
      qualityOfUncertainty: 0 as const,
      behavioralIntegration: 2 as const,
    },
    penalty: 0 as const,
  },
};

// ---- Setup ------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockClassifySafety.mockResolvedValue({ decision: "allow" });
  mockAnalyze.mockResolvedValue({ status: "disabled" });
});

// ---- Consent enforcement ----------------------------------------------------

describe("processAnalyzeRequest — AI consent", () => {
  it("returns 403 when aiConsent is false", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      preferences: { aiConsent: false },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
    expect((result.body as { code: string }).code).toBe("AI_CONSENT_REQUIRED");
  });

  it("does not call the AI provider when consent is absent", async () => {
    await processAnalyzeRequest({ ...VALID_REQUEST, preferences: { aiConsent: false } });
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("does not call the safety service when consent is absent", async () => {
    await processAnalyzeRequest({ ...VALID_REQUEST, preferences: { aiConsent: false } });
    expect(mockClassifySafety).not.toHaveBeenCalled();
  });
});

// ---- Answer validation ------------------------------------------------------

describe("processAnalyzeRequest — answer validation", () => {
  it("returns 422 for a version mismatch", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      questionnaireVersion: "RMP-0.9",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect((result.body as { code: string }).code).toBe("INVALID_ANSWER_SET");
  });

  it("returns 422 for an unknown question ID", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      answers: [{ questionId: "XX99", optionId: "A" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect((result.body as { code: string }).code).toBe("INVALID_ANSWER_SET");
  });

  it("returns 422 for an unknown option ID", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      answers: [{ questionId: "ER01", optionId: "Z" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
  });
});

// ---- Narrative word cap enforcement -----------------------------------------

describe("processAnalyzeRequest — narrative word cap", () => {
  it("returns 422 when N01 event field exceeds its cap (90 words)", async () => {
    const longText = "word ".repeat(91).trim();
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {
        N01: { skipped: false, fields: { event: longText, selfStory: "", newUnderstanding: "" } },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect((result.body as { code: string }).code).toBe("NARRATIVE_WORD_CAP_EXCEEDED");
    expect((result.body as { exerciseId: string }).exerciseId).toBe("N01");
  });

  it("does not cap-check skipped exercises", async () => {
    const longText = "word ".repeat(200).trim();
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {
        N01: N01_CONTENT,
        N02: { skipped: true, fields: { pattern: longText } },
      },
    });
    // Should not reject for the skipped exercise
    expect(result.ok).toBe(true);
  });
});

// ---- not_scored path ---------------------------------------------------------

describe("processAnalyzeRequest — not_scored", () => {
  it("returns not_scored when both exercises are skipped", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: { N01: { skipped: true, fields: {} }, N02: { skipped: true, fields: {} } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("not_scored");
    if (result.payload.status === "not_scored") {
      expect(result.payload.reason).toBe("narrative_threshold_not_met");
    }
  });

  it("returns not_scored when narrative content is below threshold", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {
        N01: {
          skipped: false,
          fields: { event: "a few words", selfStory: "", newUnderstanding: "" },
        },
        N02: { skipped: false, fields: { pattern: "a few words", contexts: "", unknown: "" } },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("not_scored");
  });

  it("does not call safety service when not_scored", async () => {
    await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {},
    });
    expect(mockClassifySafety).not.toHaveBeenCalled();
  });

  it("does not call AI provider when not_scored", async () => {
    await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {},
    });
    expect(mockAnalyze).not.toHaveBeenCalled();
  });
});

// ---- safety_interruption path ------------------------------------------------

describe("processAnalyzeRequest — safety interruption", () => {
  it("returns safety_interruption when classifier triggers interrupt", async () => {
    mockClassifySafety.mockResolvedValue({
      decision: "interrupt",
      reason: "self_harm_immediate",
      message: {
        heading: "It looks like you may be in crisis right now.",
        body: "Please reach out to a crisis service.",
        resources: [],
      },
    });

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("safety_interruption");
    if (result.payload.status === "safety_interruption") {
      expect(result.payload.message.heading).toContain("crisis");
    }
  });

  it("does not call AI provider after safety interrupt", async () => {
    mockClassifySafety.mockResolvedValue({
      decision: "interrupt",
      reason: "active_emergency",
      message: { heading: "Emergency", body: "Call services.", resources: [] },
    });

    await processAnalyzeRequest(VALID_REQUEST);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("proceeds to AI call on review_fallback (non-blocking)", async () => {
    mockClassifySafety.mockResolvedValue({
      decision: "review_fallback",
      reason: "ambiguous_high_risk",
    });
    mockAnalyze.mockResolvedValue(VALID_AI_OUTPUT);

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(mockAnalyze).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("completed");
  });
});

// ---- unavailable paths -------------------------------------------------------

describe("processAnalyzeRequest — unavailable", () => {
  it("returns unavailable/disabled when AI provider is disabled", async () => {
    mockAnalyze.mockResolvedValue({ status: "disabled" });

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("unavailable");
    if (result.payload.status === "unavailable") {
      expect(result.payload.reason).toBe("disabled");
    }
  });

  it("returns unavailable/rate_limited on provider rate limit", async () => {
    mockAnalyze.mockResolvedValue({ status: "error", reason: "rate_limited" });

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("unavailable");
    if (result.payload.status === "unavailable") {
      expect(result.payload.reason).toBe("rate_limited");
    }
  });

  it("returns unavailable/timeout on provider timeout", async () => {
    mockAnalyze.mockResolvedValue({ status: "error", reason: "timeout" });

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("unavailable");
    if (result.payload.status === "unavailable") {
      expect(result.payload.reason).toBe("timeout");
    }
  });

  it("returns unavailable/invalid_output on schema rejection", async () => {
    mockAnalyze.mockResolvedValue({ status: "error", reason: "invalid_output" });

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("unavailable");
    if (result.payload.status === "unavailable") {
      expect(result.payload.reason).toBe("invalid_output");
    }
  });

  it("returns unavailable/error on provider error", async () => {
    mockAnalyze.mockResolvedValue({ status: "error", reason: "provider_error" });

    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("unavailable");
    if (result.payload.status === "unavailable") {
      expect(result.payload.reason).toBe("error");
    }
  });
});

// ---- completed path ----------------------------------------------------------

describe("processAnalyzeRequest — completed", () => {
  beforeEach(() => {
    mockAnalyze.mockResolvedValue(VALID_AI_OUTPUT);
  });

  it("returns completed status", async () => {
    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("completed");
  });

  it("includes promptVersion RMP-AI-1.0", async () => {
    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.payload.status !== "completed") return;
    expect(result.payload.promptVersion).toBe("RMP-AI-1.0");
  });

  it("includes the analysis content (observations, experiments, excerpt, reviewPeriod)", async () => {
    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.payload.status !== "completed") return;
    expect(result.payload.analysis.observations).toHaveLength(3);
    expect(result.payload.analysis.behavioralExperiments).toHaveLength(2);
    expect(result.payload.analysis.excerpt).toBe(
      "Thoughtful self-reflection with emerging behavioral awareness.",
    );
    expect(result.payload.analysis.reviewPeriodDays).toBe(21);
  });

  it("computes narrative score in app code — model penalty and rubric used, not any model aggregate", async () => {
    // Rubric: specificity=1, ownership=2, emotionalPrecision=1, causalDepth=1,
    //   qualityOfUncertainty=0, behavioralIntegration=2 → sum=7, penalty=0
    // Expected score: Math.round((7 / 12) * 100) = 58
    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.payload.status !== "completed") return;
    const { narrativeScore } = result.payload;
    expect(narrativeScore.status).toBe("scored"); // both N01 and N02 meet threshold
    if (narrativeScore.status !== "scored") return;
    expect(narrativeScore.score).toBe(58);
  });

  it("narrativeScore is scored when both exercises meet threshold", async () => {
    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.payload.status !== "completed") return;
    expect(result.payload.narrativeScore.status).toBe("scored");
  });

  it("narrativeScore is limited_evidence when only one exercise meets threshold", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {
        N01: N01_CONTENT,
        N02: { skipped: true, fields: {} }, // N02 skipped → only N01 meets threshold
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.payload.status !== "completed") return;
    expect(result.payload.narrativeScore.status).toBe("limited_evidence");
  });

  it("sends prompt to AI provider", async () => {
    await processAnalyzeRequest(VALID_REQUEST);
    expect(mockAnalyze).toHaveBeenCalledOnce();
    const call = mockAnalyze.mock.calls[0]![0];
    expect(typeof call.systemPrompt).toBe("string");
    expect(typeof call.userPrompt).toBe("string");
    expect(call.systemPrompt.length).toBeGreaterThan(0);
    expect(call.userPrompt.length).toBeGreaterThan(0);
  });

  it("runs safety classification before calling AI provider", async () => {
    const callOrder: string[] = [];
    mockClassifySafety.mockImplementation(async () => {
      callOrder.push("safety");
      return { decision: "allow" };
    });
    mockAnalyze.mockImplementation(async () => {
      callOrder.push("ai");
      return VALID_AI_OUTPUT;
    });

    await processAnalyzeRequest(VALID_REQUEST);
    expect(callOrder).toEqual(["safety", "ai"]);
  });

  it("passes combined narrative text to safety classifier", async () => {
    await processAnalyzeRequest(VALID_REQUEST);
    expect(mockClassifySafety).toHaveBeenCalledOnce();
    const textArg = mockClassifySafety.mock.calls[0]![0];
    expect(textArg).toContain("disagreed with my manager");
    expect(textArg).toContain("avoid sharing my real opinion");
  });

  it("narrative text is not included in the returned payload (PRD §15.8)", async () => {
    const result = await processAnalyzeRequest(VALID_REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.stringify(result.payload);
    expect(json).not.toContain("disagreed with my manager");
    expect(json).not.toContain("avoid sharing my real opinion");
  });
});

// ---- Determinism ------------------------------------------------------------

describe("processAnalyzeRequest — determinism", () => {
  it("identical inputs produce identical deterministic scores (narrative score may differ only if provider mock changes)", async () => {
    mockAnalyze.mockResolvedValue(VALID_AI_OUTPUT);

    const [a, b] = await Promise.all([
      processAnalyzeRequest(VALID_REQUEST),
      processAnalyzeRequest(VALID_REQUEST),
    ]);

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    if (a.payload.status !== "completed" || b.payload.status !== "completed") return;
    expect(a.payload.narrativeScore).toEqual(b.payload.narrativeScore);
    expect(a.payload.promptVersion).toBe(b.payload.promptVersion);
  });
});

// ---- Only-N01 and only-N02 meet threshold -----------------------------------

describe("processAnalyzeRequest — single-exercise threshold scenarios", () => {
  beforeEach(() => {
    mockAnalyze.mockResolvedValue(VALID_AI_OUTPUT);
  });

  it("proceeds when only N02 meets threshold (N01 skipped)", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: {
        N01: { skipped: true, fields: {} },
        N02: N02_CONTENT,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("completed");
    if (result.payload.status !== "completed") return;
    expect(result.payload.narrativeScore.status).toBe("limited_evidence");
  });

  it("proceeds when only N01 meets threshold (N02 absent)", async () => {
    const result = await processAnalyzeRequest({
      ...VALID_REQUEST,
      narrative: { N01: N01_CONTENT },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.status).toBe("completed");
    if (result.payload.status !== "completed") return;
    expect(result.payload.narrativeScore.status).toBe("limited_evidence");
  });
});
