import { z } from "zod";

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
