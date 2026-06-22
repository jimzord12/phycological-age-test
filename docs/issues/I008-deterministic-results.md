# I008 — Deterministic results screen (with text equivalents)

- **Status:** ✅ done
- **Phase:** B (client flow)
- **Depends on:** I002, I003
- **Complexity:** 4

## Context

Deterministic results render immediately after `/score`, independent of any AI analysis
(PRD §7.7, §6 core UX rule, §12 interpretation).

## Scope

**In:**
- Render: Structured Maturity Index (0–100) — or an "index unavailable / answer more items"
  state when `null` (DD-1); confidence label + concise reasons; five dimension cards or
  per-dimension `Insufficient data` state; profile-balance label; strongest dimension; one
  or two lower dimensions described neutrally (growth-area selection, DOMAIN §12.3); the
  non-clinical disclaimer; optional age metaphor only when enabled, with the required
  qualifying copy; `AI analysis unavailable` state when AI is disabled or fails.
- Dimension bands as descriptive UI labels (DOMAIN §12.1); every chart/bar duplicated as a
  text value; score animation must not delay access to the final number; respect reduced
  motion.

**Out:** AI section rendering (depends on I011; leave a placeholder/slot), export (I009).

## Acceptance criteria

- [ ] Deterministic results render before/independently of AI.
- [ ] Null index shows the unavailable state, not a fabricated number.
- [ ] Insufficient dimensions show the correct state; reportable ones show band + score.
- [ ] Confidence shown separately from the maturity score, with reasons.
- [ ] All visuals have textual equivalents; reduced motion respected; usable at 320px/200%.
- [ ] Required disclaimer present; age metaphor qualified and only when enabled.

## References

PRD §7.7, §6, §8, §9; DOMAIN §12, §9.4, §9.5; DOMAIN-DECISIONS DD-1.
