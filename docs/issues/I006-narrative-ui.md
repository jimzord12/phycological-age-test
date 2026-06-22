# I006 — Narrative exercise UI (optional, word caps)

- **Status:** ✅ done
- **Phase:** B (client flow)
- **Depends on:** I005
- **Complexity:** 2

## Context

Two optional narrative exercises placed mid-flow. Skipping must never feel punished
(PRD §7.5; DOMAIN §8, §3).

## Scope

**In:**
- Per-exercise UI: intro copy, separate text areas per sub-question, live word counts,
  warning at 80% of the field cap, hard cap that prevents extra input without deleting
  existing text, `Skip this exercise`, concise repeated privacy notice.
- Persist drafts and skipped state via I003; no guilt-inducing copy.
- Use canonical field caps (N01: 90/60/90, N02: 70/50/70) and `countWords` semantics from
  `src/domain/narrative-rubric.ts`.

**Out:** server validation of caps (I011 enforces server-side), AI analysis.

## Acceptance criteria

- [ ] Each exercise is clearly optional with a working skip action.
- [ ] Live word counts; 80% warning; input blocked beyond the hard cap without data loss.
- [ ] Word counting matches the domain `countWords` (whitespace-token based).
- [ ] Privacy notice shown; no guilt-inducing language.

## References

PRD §7.5; DOMAIN §8, §3, §16 (fairness in copy).
