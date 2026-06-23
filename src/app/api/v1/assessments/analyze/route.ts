/**
 * I011 — POST /api/v1/assessments/analyze
 *
 * Generates the AI-assisted narrative analysis server-side and only with
 * explicit AI consent. Narrative score is computed in application code from
 * the model's rubric values — the model never supplies an aggregate (PRD §15.7).
 *
 * Response union: completed | not_scored | safety_interruption | unavailable.
 * Raw narrative text is never persisted or logged.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emitEvent, newRequestId } from "@/server/observability";
import { checkAnalyzeLimit, extractClientKey } from "@/server/rate-limit";
import { scoreStructuredAssessment, validateAnswerSet } from "@/domain/scoring";
import {
  calculateNarrativeScore,
  classifyExerciseContent,
  fieldsOverCap,
  type NarrativeContent,
} from "@/domain/narrative-rubric";
import type { NarrativeRubricScores, NarrativeScoreResult } from "@/domain/result-types";
import { PROMPT_VERSION, type PromptVersion } from "@/domain/versions";
import { classifySafety, type SafetyMessage } from "@/server/safety-service";
import { analyze } from "@/server/ai-provider";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type NarrativeExerciseInput,
  type PromptNarrativeInput,
} from "@/server/analyze-prompt";

const MAX_BODY_BYTES = 65_536; // 64 KB — accommodates full narrative content

// ---- Request schema ---------------------------------------------------------

const NarrativeExerciseSchema = z.object({
  fields: z.record(z.string(), z.string()),
  skipped: z.boolean().optional().default(false),
});

const AnalyzeRequestSchema = z.object({
  questionnaireVersion: z.string(),
  answers: z.array(z.object({ questionId: z.string(), optionId: z.string() })).max(50),
  preferences: z.object({
    aiConsent: z.boolean(),
    includeAgeMetaphor: z.boolean().optional(),
  }),
  narrative: z
    .object({
      N01: NarrativeExerciseSchema.optional(),
      N02: NarrativeExerciseSchema.optional(),
    })
    .optional()
    .default({}),
});

// ---- Response types (exported for contract tests) ---------------------------

export type AnalysisContent = {
  observations: Array<{ text: string; evidence: string }>;
  behavioralExperiments: Array<{ text: string }>;
  excerpt: string;
  reviewPeriodDays: number;
};

export type AnalyzeResponse =
  | {
      status: "completed";
      promptVersion: PromptVersion;
      narrativeScore: NarrativeScoreResult;
      analysis: AnalysisContent;
    }
  | { status: "not_scored"; reason: "narrative_threshold_not_met" }
  | { status: "safety_interruption"; message: SafetyMessage }
  | {
      status: "unavailable";
      reason: "disabled" | "error" | "rate_limited" | "timeout" | "invalid_output";
    };

// ---- Business logic (exported for direct unit testing) ----------------------

export type AnalyzeRequestInput = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeSuccess = { ok: true; payload: AnalyzeResponse };
export type AnalyzeFailure = {
  ok: false;
  status: 400 | 403 | 422;
  body: unknown;
};

export async function processAnalyzeRequest(
  input: AnalyzeRequestInput,
): Promise<AnalyzeSuccess | AnalyzeFailure> {
  // 1. Require explicit AI consent
  if (!input.preferences.aiConsent) {
    return { ok: false, status: 403, body: { code: "AI_CONSENT_REQUIRED" } };
  }

  // 2. Revalidate structured answers server-side (never trust client-computed scores)
  const validation = validateAnswerSet(input.questionnaireVersion, input.answers);
  if (!validation.ok) {
    return {
      ok: false,
      status: 422,
      body: { code: "INVALID_ANSWER_SET", fieldErrors: validation.errors },
    };
  }

  // 3. Recompute deterministic structured results
  const structuredResult = scoreStructuredAssessment(validation.answers);

  // 4. Server-side narrative word-cap validation (UI prevents this; server enforces it)
  const n01Raw: NarrativeExerciseInput = input.narrative.N01 ?? null;
  const n02Raw: NarrativeExerciseInput = input.narrative.N02 ?? null;

  if (n01Raw !== null && !n01Raw.skipped) {
    const over = fieldsOverCap("N01", n01Raw.fields);
    if (over.length > 0) {
      return {
        ok: false,
        status: 422,
        body: { code: "NARRATIVE_WORD_CAP_EXCEEDED", exerciseId: "N01", fields: over },
      };
    }
  }
  if (n02Raw !== null && !n02Raw.skipped) {
    const over = fieldsOverCap("N02", n02Raw.fields);
    if (over.length > 0) {
      return {
        ok: false,
        status: 422,
        body: { code: "NARRATIVE_WORD_CAP_EXCEEDED", exerciseId: "N02", fields: over },
      };
    }
  }

  // 5. Classify narrative content against per-exercise thresholds
  const narrativeContent: NarrativeContent = {
    N01: classifyExerciseContent("N01", n01Raw?.fields ?? {}, n01Raw?.skipped ?? true),
    N02: classifyExerciseContent("N02", n02Raw?.fields ?? {}, n02Raw?.skipped ?? true),
  };

  // 6. Return not_scored when no exercise meets its content threshold (DOMAIN §10.4)
  const anyMeetsThreshold =
    narrativeContent.N01 === "meets_threshold" || narrativeContent.N02 === "meets_threshold";
  if (!anyMeetsThreshold) {
    return { ok: true, payload: { status: "not_scored", reason: "narrative_threshold_not_met" } };
  }

  // 7. Safety screening on combined narrative text before sending to the provider
  const combinedText = combineNarrativeText(n01Raw, n02Raw);
  const safetyDecision = await classifySafety(combinedText);

  if (safetyDecision.decision === "interrupt") {
    return {
      ok: true,
      payload: { status: "safety_interruption", message: safetyDecision.message },
    };
  }
  // review_fallback and allow: proceed with analysis

  // 8. Build prompts and call the AI provider
  const narrativeInput: PromptNarrativeInput = { N01: n01Raw, N02: n02Raw };
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    { answers: validation.answers, result: structuredResult },
    narrativeInput,
  );

  const providerResult = await analyze({ systemPrompt, userPrompt });

  if (providerResult.status === "disabled") {
    return { ok: true, payload: { status: "unavailable", reason: "disabled" } };
  }

  if (providerResult.status === "error") {
    const reason =
      providerResult.reason === "rate_limited"
        ? "rate_limited"
        : providerResult.reason === "invalid_output"
          ? "invalid_output"
          : providerResult.reason === "timeout"
            ? "timeout"
            : "error";
    return { ok: true, payload: { status: "unavailable", reason } };
  }

  // 9. Compute narrative score in application code — model rubric values are inputs,
  //    never the aggregate (DOMAIN §10.1, PRD §15.7).
  const { rubric, penalty, observations, behavioralExperiments, excerpt, reviewPeriodDays } =
    providerResult.output;

  const narrativeRubric: NarrativeRubricScores = {
    specificity: rubric.specificity,
    ownership: rubric.ownership,
    emotionalPrecision: rubric.emotionalPrecision,
    causalDepth: rubric.causalDepth,
    qualityOfUncertainty: rubric.qualityOfUncertainty,
    behavioralIntegration: rubric.behavioralIntegration,
  };

  const narrativeScore: NarrativeScoreResult = calculateNarrativeScore(
    narrativeRubric,
    penalty,
    narrativeContent,
  );

  return {
    ok: true,
    payload: {
      status: "completed",
      promptVersion: PROMPT_VERSION,
      narrativeScore,
      analysis: { observations, behavioralExperiments, excerpt, reviewPeriodDays },
    },
  };
}

// ---- Internal helpers -------------------------------------------------------

function combineNarrativeText(n01: NarrativeExerciseInput, n02: NarrativeExerciseInput): string {
  const parts: string[] = [];
  if (n01 !== null && !n01.skipped) parts.push(...Object.values(n01.fields));
  if (n02 !== null && !n02.skipped) parts.push(...Object.values(n02.fields));
  return parts.join(" ");
}

// ---- Route handler ----------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimit = checkAnalyzeLimit(extractClientKey(request.headers));
  if (!rateLimit.ok) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
    );
  }

  const requestId = newRequestId();
  emitEvent({ event: "analysis_requested", requestId });
  const startMs = Date.now();

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ code: "REQUEST_TOO_LARGE" }, { status: 413 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ code: "REQUEST_TOO_LARGE" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "BAD_REQUEST",
        fieldErrors: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const result = await processAnalyzeRequest(parsed.data);
  const latencyMs = Date.now() - startMs;

  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  const { payload } = result;

  if (payload.status === "completed" || payload.status === "not_scored") {
    emitEvent({
      event: "analysis_completed",
      requestId,
      latencyMs,
      questionnaireVersion: parsed.data.questionnaireVersion,
      promptVersion: payload.status === "completed" ? payload.promptVersion : undefined,
      status: payload.status,
    });
  } else if (payload.status === "safety_interruption") {
    emitEvent({ event: "safety_interruption", requestId, latencyMs });
  } else {
    emitEvent({
      event: "analysis_unavailable",
      requestId,
      latencyMs,
      errorCode: payload.reason,
    });
  }

  return NextResponse.json(payload);
}
