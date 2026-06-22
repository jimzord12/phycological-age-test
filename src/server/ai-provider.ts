import { generateObject, zodSchema, APICallError, NoObjectGeneratedError, TypeValidationError } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// ------ Structured output schema ---------------------------------------------

const rubricValueSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/**
 * Zod schema for the structured object the AI model must produce.
 * Passed to generateObject() via zodSchema() — no free-form JSON parsing.
 * Rubric and penalty values are validated here; the narrative score is
 * computed independently in application code (never by the model).
 */
export const AnalysisOutputSchema = z.object({
  observations: z
    .array(
      z.object({
        text: z.string().min(1),
        evidence: z.string().min(1),
      })
    )
    .min(3)
    .max(5),
  behavioralExperiments: z
    .array(
      z.object({
        text: z.string().min(1),
      })
    )
    .min(2)
    .max(3),
  excerpt: z
    .string()
    .min(1)
    .refine(
      (text) => text.trim().split(/\s+/).filter((w) => w.length > 0).length <= 24,
      { message: "excerpt must be at most 24 words" },
    ),
  reviewPeriodDays: z.number().int().min(7).max(45),
  rubric: z.object({
    specificity: rubricValueSchema,
    ownership: rubricValueSchema,
    emotionalPrecision: rubricValueSchema,
    causalDepth: rubricValueSchema,
    qualityOfUncertainty: rubricValueSchema,
    behavioralIntegration: rubricValueSchema,
  }),
  penalty: rubricValueSchema,
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// ------ Public I/O types -----------------------------------------------------

/** Caller-assembled prompts; prompt construction is the analyze-endpoint's job (I011). */
export type AnalysisProviderInput = {
  systemPrompt: string;
  userPrompt: string;
};

export type AnalysisProviderErrorReason =
  | "timeout"
  | "rate_limited"
  | "invalid_output"
  | "provider_error";

export type AnalysisProviderResult =
  | { status: "completed"; output: AnalysisOutput }
  | { status: "disabled" }
  | { status: "error"; reason: AnalysisProviderErrorReason };

// ------ Provider resolution --------------------------------------------------

type ProviderKind = "anthropic" | "openai" | "none";

function getProviderKind(): ProviderKind {
  const raw = process.env["AI_PROVIDER"] ?? "none";
  if (raw === "anthropic" || raw === "openai") return raw;
  return "none";
}

function buildModel(kind: "anthropic" | "openai") {
  if (kind === "anthropic") {
    const provider = createAnthropic({
      baseURL: process.env["ANTHROPIC_BASE_URL"],
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });
    return provider(process.env["ANTHROPIC_MODEL"] ?? "");
  }
  const provider = createOpenAI({
    baseURL: process.env["OPENAI_BASE_URL"],
    apiKey: process.env["OPENAI_API_KEY"],
  });
  return provider(process.env["OPENAI_MODEL"] ?? "");
}

// ------ Public API -----------------------------------------------------------

/**
 * Thin wrapper around generateObject(). The only place in the codebase that
 * imports from "ai" or "@ai-sdk/*".
 *
 * With AI_PROVIDER=none (the default), returns { status: "disabled" } so the
 * deterministic flow is never blocked.
 */
export async function analyze(
  input: AnalysisProviderInput
): Promise<AnalysisProviderResult> {
  const providerKind = getProviderKind();
  if (providerKind === "none") {
    return { status: "disabled" };
  }

  const timeoutMs = Number(process.env["AI_ANALYSIS_TIMEOUT_MS"]) || 20_000;

  try {
    const model = buildModel(providerKind);
    const { object } = await generateObject({
      model,
      schema: zodSchema(AnalysisOutputSchema),
      system: input.systemPrompt,
      prompt: input.userPrompt,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    return { status: "completed", output: object };
  } catch (err: unknown) {
    return classifyError(err);
  }
}

// ------ Error classification -------------------------------------------------

function classifyError(err: unknown): AnalysisProviderResult {
  if (err instanceof APICallError && err.statusCode === 429) {
    return { status: "error", reason: "rate_limited" };
  }
  if (err instanceof NoObjectGeneratedError || err instanceof TypeValidationError) {
    return { status: "error", reason: "invalid_output" };
  }
  if (
    err instanceof Error &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  ) {
    return { status: "error", reason: "timeout" };
  }
  return { status: "error", reason: "provider_error" };
}
