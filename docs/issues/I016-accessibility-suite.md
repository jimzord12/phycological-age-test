# I016 — Accessibility test suite + audit

- **Status:** ⬜ not started
- **Phase:** E (QA)
- **Depends on:** I008
- **Complexity:** 3

## Context

Target WCAG 2.2 AA behavior across the flow, combining automated checks with manual
verification (PRD §9, §21.4).

## Scope

**In:**
- Automated axe checks (e.g. `@axe-core/playwright`) on landing, consent, questionnaire,
  narrative, review, and results screens.
- Verify: focus order, screen-reader labels, radio groups, error-summary announcements with
  `aria-live="polite"`, result-bar text equivalents, 200% zoom, reduced motion, contrast,
  modal focus trap + return, correct language attribute, logical tab order.
- Document any manual-only checks and their results.

**Out:** functional journeys (I015).

## Acceptance criteria

- [ ] Automated a11y checks pass on all primary screens.
- [ ] Keyboard-only operation; visible focus; no color-only information.
- [ ] Result visuals have text equivalents; reduced motion respected.
- [ ] Layout usable at 320px and 200% zoom; modal focus managed.

## References

PRD §9, §21.4, §8.
