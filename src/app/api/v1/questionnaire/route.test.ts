import { describe, expect, it } from "vitest";
import { NARRATIVE_EXERCISES, STRUCTURED_QUESTIONS } from "@/domain/questionnaire";
import { buildQuestionnairePayload, QuestionnaireResponseSchema } from "./route";

describe("GET /api/v1/questionnaire — I001 contract tests", () => {
  it("payload passes the Zod response schema", () => {
    const payload = buildQuestionnairePayload();
    expect(() => QuestionnaireResponseSchema.parse(payload)).not.toThrow();
  });

  it("questionnaireVersion is RMP-1.0 and scoringVersion is RMP-SCORE-1.0", () => {
    const payload = buildQuestionnairePayload();
    expect(payload.questionnaireVersion).toBe("RMP-1.0");
    expect(payload.scoringVersion).toBe("RMP-SCORE-1.0");
  });

  it("includes all 24 structured questions in canonical order", () => {
    const payload = buildQuestionnairePayload();
    expect(payload.structured).toHaveLength(24);
    expect(payload.structured.map((q) => q.id)).toEqual(
      STRUCTURED_QUESTIONS.map((q) => q.id),
    );
  });

  it("includes both narrative exercises with field word caps", () => {
    const payload = buildQuestionnairePayload();
    expect(payload.narrative).toHaveLength(2);
    expect(payload.narrative[0]!.id).toBe("N01");
    expect(payload.narrative[1]!.id).toBe("N02");
    expect(payload.narrative[0]!.fields.map((f) => f.maxWords)).toEqual(
      NARRATIVE_EXERCISES[0]!.fields.map((f) => f.maxWords),
    );
    expect(payload.narrative[1]!.fields.map((f) => f.maxWords)).toEqual(
      NARRATIVE_EXERCISES[1]!.fields.map((f) => f.maxWords),
    );
  });

  it("contains the required non-clinical disclaimer (DOMAIN §2)", () => {
    const payload = buildQuestionnairePayload();
    expect(payload.disclaimer.length).toBeGreaterThan(50);
    expect(payload.disclaimer).toContain("not a diagnosis");
  });

  it("never exposes numeric option scores (PRD §14.1)", () => {
    const payload = buildQuestionnairePayload();
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/"score"\s*:/);
    for (const question of payload.structured) {
      for (const option of question.options) {
        expect("score" in option).toBe(false);
      }
    }
  });

  it("includes estimatedMinutes { min: 12, max: 18 }", () => {
    const payload = buildQuestionnairePayload();
    expect(payload.estimatedMinutes).toEqual({ min: 12, max: 18 });
  });
});
