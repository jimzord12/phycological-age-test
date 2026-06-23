# I013 — Privacy-safe observability + rate limiting

- **Status:** ⬜ not started
- **Phase:** D (cross-cutting)
- **Depends on:** I002
- **Complexity:** 2

## Context

Operational visibility without ever logging answer content, narrative text, secrets, or full
IPs (PRD §20, §10.3, §11). Rate limit the score and analysis endpoints with
privacy-preserving controls.

## Scope

**In:**

- Structured event logging: `questionnaire_loaded`, `score_requested`, `score_completed`,
  `score_rejected`, `analysis_requested`, `analysis_completed`, `analysis_unavailable`,
  `safety_interruption`, `export_generated`; fields limited to request ID, versions, status,
  latency, error code, deployment version.
- A log scrubber ensuring request bodies / secrets / prompts never enter logs.
- Rate limiting (`src/server/rate-limit.ts`) on score + analyze endpoints by
  session/client controls; request-size limits; toggled by `RATE_LIMIT_ENABLED`.

**Out:** the optional aggregate telemetry pipeline (only if separately approved per PRD
§10.4 — out of scope here).

## Acceptance criteria

- [ ] No answer choices, narrative text, prompts, model excerpts, full IPs, or credentials
      appear in any log.
- [ ] Listed structured events emitted with the permitted fields only.
- [ ] Score and analyze endpoints are rate-limited and size-limited; behavior gated by env.

## References

PRD §20, §10.3, §10.4, §11.
