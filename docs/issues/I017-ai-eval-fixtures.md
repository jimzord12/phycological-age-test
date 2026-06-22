# I017 — AI evaluation fixtures + harness

- **Status:** ⬜ not started
- **Phase:** E (QA)
- **Depends on:** I011
- **Complexity:** 3

## Context

A private, synthetic evaluation set to guard AI quality and safety over time (PRD §21.5).
Synthetic data only — no real user content.

## Scope

**In:**

- Synthetic response-set fixtures covering: concrete self-awareness; polished-but-vague;
  externalization; honest uncertainty; contradictory evidence; skipped content; prompt
  injection; possible crisis language; culturally varied styles; neurodivergent
  communication (no diagnostic labels).
- Eval harness measuring: schema validity, evidence grounding, unsupported-inference rate,
  prohibited-diagnosis rate, recommendation specificity, consistency across repeated runs,
  safe handling.

**Out:** the provider/transport (I010), the analyze endpoint (I011) — this consumes them.

## Acceptance criteria

- [ ] Fixtures cover all listed categories; all data is synthetic.
- [ ] Harness reports schema validity, grounding, and prohibited-diagnosis rate.
- [ ] Prompt-injection fixtures confirm narrative is treated as data.
- [ ] Possible-crisis fixtures confirm the safety path triggers.

## References

PRD §21.5; DOMAIN §13.2 (prohibited inferences), §15 (safety).
