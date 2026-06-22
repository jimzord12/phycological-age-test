# I005 — Questionnaire shell + structured item UI (accessible)

- **Status:** ✅ done
- **Phase:** B (client flow)
- **Depends on:** I003
- **Complexity:** 4

## Context

The core interaction: 26-step flow with accessible radio-based items, no score/correctness
feedback during the quiz, and full keyboard support (PRD §7.3, §7.4, §9).

## Scope

**In:**
- Shell: `Step X of 26` progress (with screen-reader text), optional dimension label
  (never score direction), question text, semantic native radio options, the
  `Not applicable` option, Back/Continue, `Exit and delete current answers`.
- Interaction: exactly one response per item; selecting does not auto-advance unless the
  user enabled auto-advance; arrow keys move between choices; Enter/Space selects; focus
  moves to the question heading after navigation; canonical answer order.
- Autosave via I003; no per-question feedback.
- Mid-flow narrative placement hooks (after item 8 and item 14) calling into I006.

**Out:** narrative field UI internals (I006), review (I007), results (I008).

## Acceptance criteria

- [ ] Entire structured flow is operable with keyboard only; visible focus states.
- [ ] Radio groups have programmatic names; no information by color alone.
- [ ] No score/correctness/maturity feedback appears during the quiz.
- [ ] Focus returns to the question heading after Back/Continue.
- [ ] Usable at 320px width and 200% zoom; 44px touch targets.

## References

PRD §7.3, §7.4, §9, §8 (layout/motion); DOMAIN §6.3 (narrative placement), §14 (anti-gaming).
