# I002 — `POST /api/v1/assessments/score`

- **Status:** ⬜ not started
- **Phase:** A (API foundation)
- **Depends on:** Phase 0 (domain core)
- **Complexity:** 3

## Context

Deterministic results must be computed on the server from the raw answers; never trust a
client-calculated score (PRD §11, §17). The domain provides `validateAnswerSet`,
`scoreStructuredAssessment`, `calculateConfidence`, and `calculateAgeMetaphor`.

## Scope

**In:**
- Route handler `src/app/api/v1/assessments/score/route.ts`.
- Zod request validation: content type, payload shape, `questionnaireVersion`, answers
  (known item IDs, known option IDs, no duplicates), `preferences.includeAgeMetaphor`.
- On valid input: recompute dimensions, SMI, profile balance, confidence, and (only if
  opted in) the age metaphor; return the PRD §14.2 `result` object plus a short-lived,
  opaque `assessmentId` that encodes no answers or personal data.
- Typed error response (PRD §14.4) with `fieldErrors` for validation failures; map domain
  validation errors to `INVALID_ANSWER_SET`.
- Request-size limit; in-memory only (no persistence of answers).

**Out:** AI analysis (I011), rate limiting (I013 — leave a clear hook), UI.

## Acceptance criteria

- [ ] Scores are recomputed server-side; identical answers yield identical results.
- [ ] Unknown questions/options and duplicate answers are rejected with field-level errors.
- [ ] Version mismatch is rejected.
- [ ] `Not applicable` excluded from scoring; insufficient-data thresholds enforced.
- [ ] SMI is `null` when any dimension is insufficient (DOMAIN-DECISIONS DD-1).
- [ ] Age metaphor present only when `includeAgeMetaphor` is true.
- [ ] `assessmentId` is opaque and stateless; no raw answers logged (PRD §10.3, §20).
- [ ] Contract tests cover recomputation and rejection paths.

## References

PRD §14.2, §14.4, §17, §10.3, §11; DOMAIN §9, §11.
