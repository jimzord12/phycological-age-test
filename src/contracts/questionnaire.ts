import { z } from "zod";

const PublicOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  isNotApplicable: z.boolean(),
});

const PublicStructuredQuestionSchema = z.object({
  kind: z.literal("structured"),
  id: z.string(),
  dimension: z.string(),
  prompt: z.string(),
  options: z.array(PublicOptionSchema),
});

const NarrativeFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  maxWords: z.number(),
});

const NarrativeExerciseSchema = z.object({
  kind: z.literal("narrative"),
  id: z.enum(["N01", "N02"]),
  title: z.string(),
  intro: z.string(),
  fields: z.array(NarrativeFieldSchema),
  minimumTotalWords: z.number(),
});

export const QuestionnaireResponseSchema = z.object({
  questionnaireVersion: z.literal("RMP-1.0"),
  scoringVersion: z.literal("RMP-SCORE-1.0"),
  disclaimer: z.string(),
  estimatedMinutes: z.object({ min: z.literal(12), max: z.literal(18) }),
  structured: z.array(PublicStructuredQuestionSchema),
  narrative: z.array(NarrativeExerciseSchema),
});

export type QuestionnaireResponse = z.infer<typeof QuestionnaireResponseSchema>;
