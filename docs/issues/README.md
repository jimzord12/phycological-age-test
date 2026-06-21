# Issues — decomposed remaining work

Each file is a self-contained, independently-grabbable vertical slice with its own scope,
acceptance criteria, and references to the governing PRD/DOMAIN sections. Status is tracked
in the root [`PROGRESS.md`](../../PROGRESS.md).

## Conventions

- **Source-of-truth order** (PRD §2): DOMAIN rules → PRD safety/privacy/security → PRD
  acceptance criteria → PRD UX → PRD architecture → implementer choices.
- **Dependency rule** (PRD §12): UI and API may depend on `src/domain/`; `src/domain/` must
  not depend on framework, database, network, or AI-provider code.
- Do not modify question wording, score maps, formulas, or the AI rubric without a versioned
  domain change (DOMAIN §17). Record any necessary deviation in
  [`../DOMAIN-DECISIONS.md`](../DOMAIN-DECISIONS.md).
- Each issue should land with its own tests and keep `pnpm check` + `pnpm test` green.

## Suggested order

```
A (API):      I001 → I002
B (client):   I003 → I004 → I005 → I006 → I007 → I008 → I009
C (AI):       I010, I012 → I011
D (cross):    I013, I014
E (QA):       I016, I015, I017
F (delivery): I018
```

Phases B and C can proceed in parallel once Phase A lands. The AI layer (C) must only be
wired after deterministic scoring and graceful fallback are complete (PRD §25).
