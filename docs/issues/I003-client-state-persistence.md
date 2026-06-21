# I003 — Client assessment state + session persistence

- **Status:** ✅ done
- **Phase:** B (client flow)
- **Depends on:** I001
- **Complexity:** 3

## Context

The questionnaire must work offline after initial load, survive an accidental refresh
within the same browser session, and never persist raw narrative text to `localStorage`
(PRD §10.2, §18).

## Scope

**In:**
- `AssessmentState` per PRD §18 (version, step index, structured answers, narrative drafts,
  consent, preferences, phase).
- State container (React context or store) with debounced writes to `sessionStorage`.
- Resume from `sessionStorage` on load; on `questionnaireVersion` mismatch, do **not** score
  the old draft — offer to discard or export the raw local draft.
- Fetch and cache the public questionnaire (I001) for navigation without further network.

**Out:** screen UI (I004–I008), server calls beyond fetching the questionnaire.

## Acceptance criteria

- [x] Refresh mid-assessment restores the active draft from `sessionStorage`.
- [x] No raw narrative text or API keys are written to `localStorage`.
- [x] Version mismatch blocks scoring and surfaces discard/export options.
- [x] Writes are debounced; navigation requires no network after initial load.

## References

PRD §18, §10.2, §7.3.
