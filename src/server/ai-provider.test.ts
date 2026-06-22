import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnalysisProviderInput, AnalysisOutput } from "./ai-provider";

// Keep real error classes; only mock generateObject.
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: vi.fn() };
});
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => ({ specificationVersion: "v1", modelId: "test" }))),
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ specificationVersion: "v1", modelId: "test" }))),
}));

// Import after mocks are registered.
const { analyze, AnalysisOutputSchema } = await import("./ai-provider");
const { generateObject, APICallError, NoObjectGeneratedError, TypeValidationError } =
  await import("ai");
const mockGenerateObject = vi.mocked(generateObject);

// ------ Fixture data ----------------------------------------------------------

const INPUT: AnalysisProviderInput = {
  systemPrompt: "You are a maturity assessor.",
  userPrompt: "Here are the answers: ...",
};

const VALID_OUTPUT: AnalysisOutput = {
  observations: [
    { text: "Strong emotional regulation.", evidence: "ER01: option B" },
    { text: "Consistent boundary-setting.", evidence: "IC02: option A" },
    { text: "Empathic perspective shifts.", evidence: "PT01: option C" },
  ],
  behavioralExperiments: [
    { text: "Journal for 10 minutes each evening this week." },
    { text: "Pause three seconds before responding in conflict." },
  ],
  excerpt: "Shows thoughtful self-reflection and behavioral awareness.",
  reviewPeriodDays: 30,
  rubric: {
    specificity: 1,
    ownership: 2,
    emotionalPrecision: 1,
    causalDepth: 1,
    qualityOfUncertainty: 0,
    behavioralIntegration: 2,
  },
  penalty: 0,
};

// ------ Helpers ---------------------------------------------------------------

function stubProvider(
  kind: "anthropic" | "openai" | "none",
  extra: Record<string, string> = {}
) {
  vi.stubEnv("AI_PROVIDER", kind);
  if (kind === "anthropic") {
    vi.stubEnv("ANTHROPIC_MODEL", "test-model");
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://api.example.com");
  } else if (kind === "openai") {
    vi.stubEnv("OPENAI_MODEL", "test-model");
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_BASE_URL", "https://api.example.com");
  }
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
}

// ------ Tests -----------------------------------------------------------------

describe("analyze — disabled provider", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("returns disabled when AI_PROVIDER is unset", async () => {
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "disabled" });
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("returns disabled when AI_PROVIDER=none", async () => {
    stubProvider("none");
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "disabled" });
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("returns disabled for unrecognised AI_PROVIDER value", async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "disabled" });
  });
});

describe("analyze — anthropic provider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    stubProvider("anthropic");
  });

  it("returns completed with valid output", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_OUTPUT } as never);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "completed", output: VALID_OUTPUT });
  });

  it("passes system and user prompts to generateObject", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_OUTPUT } as never);
    await analyze(INPUT);
    expect(mockGenerateObject).toHaveBeenCalledOnce();
    const call = mockGenerateObject.mock.calls[0]![0];
    expect(call.system).toBe(INPUT.systemPrompt);
    expect(call.prompt).toBe(INPUT.userPrompt);
  });

  it("uses maxRetries: 1", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_OUTPUT } as never);
    await analyze(INPUT);
    const call = mockGenerateObject.mock.calls[0]![0];
    expect(call.maxRetries).toBe(1);
  });
});

describe("analyze — openai provider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    stubProvider("openai");
  });

  it("returns completed with valid output", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_OUTPUT } as never);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "completed", output: VALID_OUTPUT });
  });
});

describe("analyze — error classification", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    stubProvider("anthropic");
  });

  it("returns rate_limited for HTTP 429", async () => {
    const err = new APICallError({
      message: "rate limited",
      url: "https://api.example.com",
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: {},
      responseBody: "rate limited",
      isRetryable: true,
      data: null,
    });
    mockGenerateObject.mockRejectedValueOnce(err);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "rate_limited" });
  });

  it("returns provider_error for non-429 HTTP errors", async () => {
    const err = new APICallError({
      message: "server error",
      url: "https://api.example.com",
      requestBodyValues: {},
      statusCode: 500,
      responseHeaders: {},
      responseBody: "server error",
      isRetryable: false,
      data: null,
    });
    mockGenerateObject.mockRejectedValueOnce(err);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "provider_error" });
  });

  it("returns invalid_output for NoObjectGeneratedError", async () => {
    const err = new NoObjectGeneratedError({
      text: "",
      response: { id: "r", timestamp: new Date(), modelId: "m" },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
        outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
      },
      finishReason: "stop",
    });
    mockGenerateObject.mockRejectedValueOnce(err);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "invalid_output" });
  });

  it("returns invalid_output for TypeValidationError", async () => {
    const err = new TypeValidationError({
      value: { bad: "output" },
      cause: new Error("schema mismatch"),
    });
    mockGenerateObject.mockRejectedValueOnce(err);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "invalid_output" });
  });

  it("returns timeout for AbortError", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    mockGenerateObject.mockRejectedValueOnce(err);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "timeout" });
  });

  it("returns timeout for TimeoutError", async () => {
    const err = new Error("timeout");
    err.name = "TimeoutError";
    mockGenerateObject.mockRejectedValueOnce(err);
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "timeout" });
  });

  it("returns provider_error for unknown errors", async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error("unexpected"));
    const result = await analyze(INPUT);
    expect(result).toEqual({ status: "error", reason: "provider_error" });
  });
});

describe("AnalysisOutputSchema", () => {
  it("accepts valid output", () => {
    const result = AnalysisOutputSchema.safeParse(VALID_OUTPUT);
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 3 observations", () => {
    const bad = { ...VALID_OUTPUT, observations: VALID_OUTPUT.observations.slice(0, 2) };
    expect(AnalysisOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects more than 5 observations", () => {
    const extra = [...VALID_OUTPUT.observations, ...VALID_OUTPUT.observations, ...VALID_OUTPUT.observations];
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, observations: extra }).success).toBe(false);
  });

  it("rejects fewer than 2 behavioral experiments", () => {
    const bad = { ...VALID_OUTPUT, behavioralExperiments: [VALID_OUTPUT.behavioralExperiments[0]!] };
    expect(AnalysisOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects more than 3 behavioral experiments", () => {
    const extra = [...VALID_OUTPUT.behavioralExperiments, ...VALID_OUTPUT.behavioralExperiments];
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, behavioralExperiments: extra }).success).toBe(false);
  });

  it("rejects reviewPeriodDays < 7", () => {
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, reviewPeriodDays: 6 }).success).toBe(false);
  });

  it("rejects reviewPeriodDays > 45", () => {
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, reviewPeriodDays: 46 }).success).toBe(false);
  });

  it("rejects rubric value outside 0–2", () => {
    const bad = { ...VALID_OUTPUT, rubric: { ...VALID_OUTPUT.rubric, specificity: 3 } };
    expect(AnalysisOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects penalty outside 0–2", () => {
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, penalty: 3 }).success).toBe(false);
  });

  it("rejects non-integer reviewPeriodDays", () => {
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, reviewPeriodDays: 14.5 }).success).toBe(false);
  });
});
