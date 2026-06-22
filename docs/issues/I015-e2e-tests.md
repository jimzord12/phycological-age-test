# I015 — E2E test journeys (Playwright)

- **Status:** ⬜ not started
- **Phase:** E (QA)
- **Depends on:** I008, I009, I011
- **Complexity:** 4

## Context

End-to-end coverage of the primary user journeys, including AI failure and safety paths
(PRD §21.3). AI calls are mocked.

## Scope

**In:** Playwright setup + the 13 required journeys:

1. All structured questions, skip narratives, deterministic result.
2. Full assessment with AI enabled, both result layers.
3. AI provider timeout, deterministic result remains usable.
4. Refresh mid-assessment and resume from session storage.
5. Keyboard-only completion.
6. Narrow mobile viewport.
7. Several items not applicable → reduced confidence.
8. Insufficient data in one dimension → correct state (and null index per DD-1).
9. Enable optional age metaphor → qualified copy.
10. Start over → local data deletion.
11. Inject HTML/script into narrative → escaped display.
12. Prompt-injection text → treated as data.
13. Mocked safety interruption → normal analysis suppressed.

**Out:** accessibility-specific assertions (I016), AI quality evaluation (I017).

## Acceptance criteria

- [ ] All 13 journeys implemented and passing against mocked AI.
- [ ] AI timeout/failure never blocks deterministic results or export.
- [ ] Safety interruption suppresses normal analysis while structured results remain.

## References

PRD §21.3, §6 (core UX rule).
