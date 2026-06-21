import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateConfidence } from "@/domain/confidence";
import {
  calculateAgeMetaphor,
  scoreStructuredAssessment,
  validateAnswerSet,
} from "@/domain/scoring";
import type {
  AnswerSetError,
  ConfidenceResult,
  DimensionResult,
  ProfileBalance,
} from "@/domain/result-types";
import type { ScoringVersion } from "@/domain/versions";
import type { DimensionId } from "@/domain/result-types";

const MAX_BODY_BYTES = 16_384; // 16 KB — far exceeds any valid 24-answer payload

// --- Request schema ---

const ScoreRequestSchema = z.object({
  questionnaireVersion: z.string(),
  answers: z.array(z.object({ questionId: z.string(), optionId: z.string() })).max(50),
  preferences: z.object({ includeAgeMetaphor: z.boolean() }).optional(),
});

// --- Response schema (exported for contract tests) ---

const DimensionResultSchema = z.union([
  z.object({
    status: z.literal("reportable"),
    score: z.number(),
    answered: z.number(),
    available: z.number(),
  }),
  z.object({
    status: z.literal("insufficient_data"),
    answered: z.number(),
    required: z.number(),
    available: z.number(),
  }),
]);

const ConfidenceReasonSchema = z.union([
  z.object({ code: z.literal("extra_not_applicable"), count: z.number(), deducted: z.number() }),
  z.object({
    code: z.literal("non_reportable_dimension"),
    dimension: z.string(),
    deducted: z.number(),
  }),
  z.object({ code: z.literal("low_coverage"), missingOrNa: z.number(), deducted: z.number() }),
  z.object({
    code: z.literal("inconsistent_pair"),
    pair: z.tuple([z.string(), z.string()]),
    deducted: z.number(),
  }),
]);

const ProfileBalanceSchema = z.object({
  spread: z.number(),
  label: z.enum(["relatively_balanced", "some_unevenness", "strongly_uneven"]),
});

export const ScoreResponseSchema = z.object({
  assessmentId: z.string().uuid(),
  result: z.object({
    scoringVersion: z.literal("RMP-SCORE-1.0"),
    dimensions: z.object({
      ER: DimensionResultSchema,
      IC: DimensionResultSchema,
      PT: DimensionResultSchema,
      IS: DimensionResultSchema,
      TD: DimensionResultSchema,
    }),
    structuredMaturityIndex: z.number().nullable(),
    profileBalance: ProfileBalanceSchema.nullable(),
    confidence: z.object({
      score: z.number(),
      label: z.enum(["high", "moderate", "low"]),
      reasons: z.array(ConfidenceReasonSchema),
    }),
    ageMetaphor: z.number().nullable(),
  }),
});

export type ScoreResponse = z.infer<typeof ScoreResponseSchema>;

// --- Business logic (exported for direct testing) ---

export type ScoreRequestInput = {
  questionnaireVersion: string;
  answers: Array<{ questionId: string; optionId: string }>;
  preferences?: { includeAgeMetaphor?: boolean };
};

export type ScoreSuccess = { ok: true; payload: ScoreResponse };
export type ScoreFailure = {
  ok: false;
  status: 422;
  body: { code: "INVALID_ANSWER_SET"; fieldErrors: AnswerSetError[] };
};

export function processScoreRequest(input: ScoreRequestInput): ScoreSuccess | ScoreFailure {
  const validation = validateAnswerSet(input.questionnaireVersion, input.answers);
  if (!validation.ok) {
    return {
      ok: false,
      status: 422,
      body: { code: "INVALID_ANSWER_SET", fieldErrors: validation.errors },
    };
  }

  const structured = scoreStructuredAssessment(validation.answers);
  const confidence = calculateConfidence(validation.answers, structured.dimensions);
  const ageMetaphor = calculateAgeMetaphor(
    structured.structuredMaturityIndex,
    input.preferences?.includeAgeMetaphor ?? false,
  );

  // assessmentId is opaque and stateless — it encodes no answers or personal data (PRD §10.3).
  const assessmentId = crypto.randomUUID();

  const payload: {
    assessmentId: string;
    result: {
      scoringVersion: ScoringVersion;
      dimensions: Record<DimensionId, DimensionResult>;
      structuredMaturityIndex: number | null;
      profileBalance: ProfileBalance | null;
      confidence: ConfidenceResult;
      ageMetaphor: number | null;
    };
  } = {
    assessmentId,
    result: { ...structured, confidence, ageMetaphor },
  };

  return { ok: true, payload: ScoreResponseSchema.parse(payload) };
}

// --- Route handler ---

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate-limiting hook point (I013): insert middleware call here before parsing.

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

  const parsed = ScoreRequestSchema.safeParse(body);
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

  const result = processScoreRequest(parsed.data);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
