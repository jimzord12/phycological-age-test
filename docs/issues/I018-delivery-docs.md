# I018 — Privacy policy draft, threat model, deployment docs

- **Status:** ⬜ not started
- **Phase:** F (delivery)
- **Depends on:** — (can start anytime; finalize after the app stabilizes)
- **Complexity:** 2

## Context

Delivery artifacts required by PRD §24 beyond code and tests.

## Scope

**In:**
- Privacy policy **draft**, explicitly marked for legal review (PRD §10.5), reflecting actual
  data handling: no accounts, no persistent raw-answer storage by default, narrative sent to
  the configured provider only on AI opt-in.
- Threat-model notes (assets, trust boundaries, prompt-injection, secret handling, abuse /
  rate-limit considerations).
- Deployment instructions: environment variables (from `.env.example`), running with AI
  disabled vs enabled, build/test commands, and a note that questionnaire/scoring/prompt
  versions appear in exported results.
- README cross-links to the above.

**Out:** legal sign-off (external), production secrets.

## Acceptance criteria

- [ ] Privacy policy draft present and marked "draft — pending legal review".
- [ ] Threat-model notes cover secrets, prompt injection, and abuse.
- [ ] Deployment docs let a new engineer build/run with AI disabled and enabled.
- [ ] `.env.example` documents names with no secrets (already present — keep in sync).

## References

PRD §24, §10.5, §23, §11.
