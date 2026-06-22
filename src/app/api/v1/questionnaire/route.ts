import { NextResponse } from "next/server";
import { QuestionnaireResponseSchema, type QuestionnaireResponse } from "@/contracts/questionnaire";
import { getPublicQuestionnaire } from "@/domain/questionnaire";
import { SCORING_VERSION } from "@/domain/versions";

export { QuestionnaireResponseSchema } from "@/contracts/questionnaire";

// --- Payload builder (exported for contract tests) ---------------------------

export function buildQuestionnairePayload(): QuestionnaireResponse {
  const base = getPublicQuestionnaire();
  return QuestionnaireResponseSchema.parse({
    ...base,
    scoringVersion: SCORING_VERSION,
    estimatedMinutes: { min: 12, max: 18 },
  });
}

// --- Route handler -----------------------------------------------------------

export function GET(): NextResponse {
  const payload = buildQuestionnairePayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
