# I009 — Export (HTML/JSON) + start over

- **Status:** ⬜ not started
- **Phase:** B (client flow)
- **Depends on:** I008
- **Complexity:** 2

## Context

Users can keep a local copy of results and fully reset without leaving server-side traces
(PRD §7.9, §7.10).

## Scope

**In:**
- Export: printable HTML result view and JSON download; optional PDF only if generated
  locally without sending data to a third party. Exports include version identifiers
  (questionnaire / scoring / prompt) and the disclaimer; decorative orbs absent from print.
- Start over: confirmation dialog → clear session-storage answers and result data →
  invalidate any ephemeral server analysis token when applicable → return to landing.

**Out:** server-side export storage (none — client only).

## Acceptance criteria

- [ ] HTML and JSON exports include version identifiers and the disclaimer.
- [ ] Exports escape user/model text; no third-party data egress for PDF.
- [ ] Start over shows confirmation and clears draft + result data.
- [ ] Print output excludes decorative background.

## References

PRD §7.9, §7.10, §17 (versions visible in exports), §11 (escaping).
