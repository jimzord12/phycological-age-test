# I007 — Review screen

- **Status:** ✅ done
- **Phase:** B (client flow)
- **Depends on:** I005, I006
- **Complexity:** 2

## Context

Before submission the user reviews completeness without seeing scores or answer
desirability (PRD §7.6).

## Scope

**In:**
- Completion count by dimension; list of unanswered or `Not applicable` items; per-narrative
  status (complete / partial / skipped); AI-analysis choice; age-metaphor choice; ability to
  jump to any item; `Submit assessment`.

**Out:** scoring (server, I002), results rendering (I008).

## Acceptance criteria

- [ ] Accurate completion and not-applicable counts per dimension.
- [ ] Narrative status reflects complete/partial/skipped correctly.
- [ ] Jump-to-item navigation works and restores focus appropriately.
- [ ] No scores or answer desirability revealed.

## References

PRD §7.6, §9.
