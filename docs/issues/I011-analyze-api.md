# I011 — `POST /api/v1/assessments/analyze` + strict output schema

- **Status:** ⬜ not started
- **Phase:** C (AI layer)
- **Depends on:** I002, I010, I012
- **Complexity:** 4

## Context

Generates the AI-assisted analysis only on the server, only with consent, and computes the
Narrative Self-Awareness score in application code — the model never decides it
(PRD §14.3, §15, DOMAIN §10).

## Scope

**In:**

- Route `src/app/api/v1/assessments/analyze/route.ts` implementing the PRD §14.3 server
  behavior: revalidate structured answers, recompute deterministic results, validate
  narrative word limits server-side, run safety screening (I012), build a **minimized**
  provider payload (PRD §15.3), request schema-constrained output, validate it, compute the
  narrative score via `calculateNarrativeScore`, return the result, and discard raw narrative
  from memory after the response.
- Versioned developer/system prompt (`RMP-AI-1.0`, PRD §15.5) treating narrative text as
  untrusted data (prompt-injection handling, PRD §15.4).
- Strict output schema (PRD §15.6): 3–5 observations each with evidence, rubric criteria
  0–2, penalty 0–2, 2–3 behavioral experiments, excerpt ≤ 24 words, review period 7–45 days,
  no markdown/HTML, additionalProperties disabled.
- `AnalyzeResponse` union: `completed | not_scored | safety_interruption | unavailable`
  (with the PRD §14.3 reason unions). Reject missing AI consent.

**Out:** provider transport (I010), safety classification logic (I012), UI rendering of the
AI section (extends I008).

## Acceptance criteria

- [ ] AI call happens only on the server and only after explicit AI opt-in.
- [ ] Model output validated against the strict schema; extra properties / invalid rubric
      values rejected; raw prose never reaches the UI.
- [ ] Narrative score computed in app code; a model-supplied aggregate is ignored.
- [ ] Every observation contains evidence (question ID or short excerpt).
- [ ] Provider error/timeout/invalid-output/rate-limited → `unavailable`; deterministic
      results remain usable.
- [ ] Prompt-injection text in narrative is treated as data.
- [ ] `not_scored` when narrative thresholds unmet (DOMAIN §10.4); `limited_evidence` label
      when one exercise meets threshold.
- [ ] Raw narrative not persisted or logged.

## References

PRD §14.3, §15.3–§15.8, §10.3, §20; DOMAIN §10, §13.
