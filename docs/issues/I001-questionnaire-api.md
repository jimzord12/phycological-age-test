# I001 — `GET /api/v1/questionnaire` (score-free)

- **Status:** ⬜ not started
- **Phase:** A (API foundation)
- **Depends on:** Phase 0 (domain core)
- **Complexity:** 2

## Context

The client needs the active questionnaire content to render the flow, but numeric option
scores are server-owned and must never reach the browser (PRD §14.1). The domain already
exposes `getPublicQuestionnaire()` which strips scores.

## Scope

**In:**
- Route handler at `src/app/api/v1/questionnaire/route.ts` returning the public payload:
  `questionnaireVersion`, `scoringVersion`, `steps`/`structured`+`narrative`, `disclaimer`,
  `estimatedMinutes: { min: 12, max: 18 }`.
- Build the response from `getPublicQuestionnaire()` only; never include `score`.
- Zod schema for the response shape; set `Cache-Control` appropriate for static content.

**Out:** scoring, persistence, AI.

## Acceptance criteria

- [ ] Response includes all 24 structured items (canonical order) and both narrative
      exercises with field word caps.
- [ ] Response contains the required non-clinical disclaimer (DOMAIN §2).
- [ ] No numeric option score appears anywhere in the serialized response (contract test
      asserts the absence of a `"score"` field).
- [ ] `questionnaireVersion === "RMP-1.0"`, `scoringVersion === "RMP-SCORE-1.0"`.

## References

PRD §14.1, §13; DOMAIN §6–§8, §17. Contract tests: PRD §21.2.
