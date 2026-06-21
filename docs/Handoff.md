# Handoff

Rolling agent-to-agent handoff. **Read this first** on arrival, then `PROGRESS.md` and the
relevant file in `docs/issues/`. Goal: make the project feel like one developer built it.
Update this file at the end of your session (replace stale "what's next" with reality).

> If `pnpm knowledge:size` ever reports KNOWLEDGE.md is over 150 KB, a note will appear at
> the **top** of this file. If you see one, your first action is to compress/distill
> KNOWLEDGE.md before anything else.

_Last updated: 2026-06-21_

---

## Where things stand

**Phase 0 and Phase A are complete. 73 tests pass.**

- Phase 0: pure domain layer — canonical bank, scoring, confidence, narrative scoring.
- I001: `GET /api/v1/questionnaire` (score-free, Zod-validated, cached).
- I002: `POST /api/v1/assessments/score` — server-side recompute, opaque `assessmentId`,
  typed error responses, 17 contract tests.

What exists today:
- `src/domain/` — canonical bank (24 structured + 2 narrative), `scoreStructuredAssessment`,
  `calculateConfidence`, `calculateNarrativeScore`, `calculateAgeMetaphor`,
  `validateAnswerSet`, `getPublicQuestionnaire`.
- `src/app/api/v1/questionnaire/route.ts` — `GET /api/v1/questionnaire`.
- `src/app/api/v1/assessments/score/route.ts` — `POST /api/v1/assessments/score`.
  Exports `processScoreRequest` (tested directly) and `ScoreResponseSchema`.
- `src/app/` — placeholder landing only (no questionnaire UI yet).
- Docs: `docs/DOMAIN-DECISIONS.md` (DD-1..DD-5), `PROGRESS.md`, `docs/issues/` (I001–I018),
  `AGENTS.md`, `KNOWLEDGE.md`.

What does **not** exist yet: the client questionnaire flow, the AI layer, safety service,
observability, E2E/a11y tests. All decomposed in `docs/issues/`.

## Git / environment

- Repo: `jimzord12/phycological-age-test`. Working branch: `claude/ai-library-selection-5cepke`.
- `pnpm install` → `pnpm test` / `pnpm typecheck` / `pnpm build`. Node ≥ 22.

## Recommended next steps

1. **Phase B client flow** — I003 (client state + session persistence) → I004 (landing +
   consent) → I005 (questionnaire shell) → I006 (narrative UI) → I007 (review) → I008
   (deterministic results screen). This is where the app becomes usable end-to-end.
2. The AI layer (I010 → I012 → I011) only **after** Phase B is solid (PRD §25). **Library
   decision (DD-5):** use the **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic` +
   `@ai-sdk/openai`). Provider swap is env-only; Z.AI GLM reachable via configurable
   `baseURL`. Structured output via `generateObject()` + Zod schema; only
   `src/server/ai-provider.ts` imports from the SDK.

## Things to keep in mind (gotchas → see KNOWLEDGE.md for detail)

- **Don't assume option "C" is the best answer.** The bank is behaviorally anchored; some
  items are midpoint-optimal (e.g. ER03 C=3, TD04 A=2). Derive max/min from the score map.
- `next build` will rewrite `tsconfig.json` (`jsx: react-jsx`, extra `include`). Expected —
  commit it, don't revert.
- Strict TS: `noUncheckedIndexedAccess` (index access is `T | undefined`) and
  `verbatimModuleSyntax` (use `import type`). The domain layer must stay pure — no `Date`,
  network, or framework imports (PRD §12 dependency rule).
- Two spec gaps are already resolved and documented: SMI is `null` when any dimension is
  insufficient (DD-1), and narrative confidence is `moderate` when exactly one exercise
  meets threshold (DD-2). Follow these; if you disagree, update the DD and the code together.

## Open questions for the user (non-blocking)

- Issues/progress are committed markdown by user preference (no GitHub Issues). Offer to
  mirror to GitHub Issues if discoverability becomes a need.
- AI provider credentials (Z.AI GLM) are not configured; the app runs fully with AI disabled
  until then. The AI increment can be built and tested against a mocked provider first.

## Routine reminders

- Update `PROGRESS.md` status when you finish an issue.
- New infra quirk? Add a terse record to `KNOWLEDGE.md`, then run `pnpm knowledge:size`.
- New spec-ambiguity resolution? Add a `DD-*` to `docs/DOMAIN-DECISIONS.md` and reference it
  from the code.
- Keep tests green and add tests with every change.
