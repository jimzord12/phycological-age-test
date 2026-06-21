# I012 — Safety service + help-resource selection

- **Status:** ⬜ not started
- **Phase:** C (AI layer)
- **Depends on:** Phase 0
- **Complexity:** 3

## Context

Narrative content must be screened before analysis. Immediate-risk content interrupts normal
analysis and shows calm help resources; the maturity model must not be the only safety
classifier (PRD §16; DOMAIN §15).

## Scope

**In:**
- `src/server/safety-service.ts` returning `SafetyDecision`:
  `allow | interrupt (self_harm_immediate | harm_to_others_immediate | active_emergency) |
  review_fallback (ambiguous_high_risk)`.
- Implementation: a conservative internal rule layer plus a provider safety/moderation
  classification — independent of the maturity-analysis prompt.
- On `interrupt`: suppress normal narrative scoring, return `safety_interruption` with a
  `SafetyMessage`; still allow the structured result to be viewed; no speculative
  psychological commentary.
- Help-resource selection module, separate from the analysis prompt; must not guess the
  user's country solely from narrative text.

**Out:** wiring into the analyze flow (I011 consumes this), localized resource content
authoring beyond a safe default set.

## Acceptance criteria

- [ ] Mocked immediate-risk content yields `interrupt` and suppresses normal analysis.
- [ ] Safety classification does not rely solely on the maturity model.
- [ ] Help-resource selection is decoupled from the analysis prompt and not inferred from
      narrative-derived location.
- [ ] Structured results remain viewable during a safety interruption.

## References

PRD §16; DOMAIN §15.
