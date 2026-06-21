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

**Phase 0, Phase A, and I003 (Phase B start) are complete. 103 tests pass.**

- Phase 0: pure domain layer — canonical bank, scoring, confidence, narrative scoring.
- I001: `GET /api/v1/questionnaire` (score-free, Zod-validated, cached).
- I002: `POST /api/v1/assessments/score` — server-side recompute, opaque `assessmentId`,
  typed error responses, 17 contract tests.
- I003: Client assessment state + session persistence — done.

What exists today:
- `src/domain/` — canonical bank (24 structured + 2 narrative), `scoreStructuredAssessment`,
  `calculateConfidence`, `calculateNarrativeScore`, `calculateAgeMetaphor`,
  `validateAnswerSet`, `getPublicQuestionnaire`.
- `src/app/api/v1/questionnaire/route.ts` — `GET /api/v1/questionnaire`.
- `src/app/api/v1/assessments/score/route.ts` — `POST /api/v1/assessments/score`.
  Exports `processScoreRequest` (tested directly) and `ScoreResponseSchema`.
- **`src/client/`** — NEW (I003):
  - `assessment-state.ts` — `AssessmentState` type, `AssessmentAction` union,
    `assessmentReducer`, `makeInitialState`, `isVersionMismatch` (pure, node-testable).
  - `storage.ts` — `loadAssessmentDraft`, `saveAssessmentDraft`, `clearAssessmentDraft`,
    `exportDraftAsJson`, `makeDebouncedSave` (sessionStorage only, browser-only guards).
  - `assessment-context.tsx` — `AssessmentProvider` + `useAssessment` hook. Handles version
    mismatch detection, blocks sessionStorage writes during mismatch, offers discard/export.
  - `use-questionnaire.ts` — `useQuestionnaire` hook with module-level cache (one fetch
    per full page load).
  - Tests: `assessment-state.test.ts` (node env, 18 tests) and `storage.test.ts` (jsdom
    per-file env, 10 tests).
- `src/app/` — placeholder landing only (no questionnaire UI yet).
- Docs: `docs/DOMAIN-DECISIONS.md` (DD-1..DD-5), `PROGRESS.md`, `docs/issues/` (I001–I018),
  `AGENTS.md`, `KNOWLEDGE.md`.

What does **not** exist yet: screen UI (I004–I008), AI layer, safety service,
observability, E2E/a11y tests. All decomposed in `docs/issues/`.

## Git / environment

- Repo: `jimzord12/phycological-age-test`. Working branch: `claude/next-open-issue-7k0za9`.
- `pnpm install` → `pnpm test` / `pnpm typecheck` / `pnpm build`. Node ≥ 22.
- `jsdom` is now a devDependency (installed for I003 DOM tests). Use
  `// @vitest-environment jsdom` at the top of test files that need a DOM.

## Recommended next steps

1. **Continue Phase B** — I004 (landing + consent screen) → I005 (questionnaire shell) →
   I006 (narrative UI) → I007 (review) → I008 (deterministic results screen).
   - I004 and I005 can consume `useAssessment()` and `useQuestionnaire()` directly from
     `src/client/`. No wiring changes needed.
   - The `AssessmentProvider` needs to be added to `src/app/layout.tsx` (or a dedicated
     client layout wrapper) before any page uses `useAssessment()`.
2. The AI layer (I010 → I012 → I011) only after Phase B is solid (PRD §25).

## Things to keep in mind (gotchas → see KNOWLEDGE.md for detail)

- **`AssessmentProvider` is not in the layout yet.** It must be added before any screen
  calls `useAssessment()`. Wrap it in a `"use client"` intermediate layout to keep server
  component benefits on the outer layout.
- **Version mismatch flow:** `versionMismatch` in context is non-null when an older draft
  exists. The consent/landing screen should check this and render the discard/export UI
  *before* presenting the normal consent form.
- **`use-questionnaire.ts` module cache:** the `moduleCache` variable resets on full page
  load (browser navigation) but persists across re-renders. Jest/Vitest tests that import
  this module may see stale cache between test runs — clear or mock as needed.
- **Don't assume option "C" is the best answer.** The bank is behaviorally anchored; some
  items are midpoint-optimal (e.g. ER03 C=3, TD04 A=2). Derive max/min from the score map.
- `next build` will rewrite `tsconfig.json` (`jsx: react-jsx`, extra `include`). Expected —
  commit it, don't revert.
- Strict TS: `noUncheckedIndexedAccess` (index access is `T | undefined`) and
  `verbatimModuleSyntax` (use `import type`). The domain layer must stay pure — no `Date`,
  network, or framework imports (PRD §12 dependency rule).
- Two spec gaps are already resolved: SMI is `null` when any dimension is insufficient
  (DD-1), narrative confidence is `moderate` when exactly one exercise meets threshold (DD-2).

## Open questions for the user (non-blocking)

- Issues/progress are committed markdown by user preference. Offer to mirror to GitHub
  Issues if discoverability becomes a need.
- AI provider credentials (Z.AI GLM) are not configured; the app runs fully with AI
  disabled until then.

## Routine reminders

- Update `PROGRESS.md` status when you finish an issue.
- New infra quirk? Add a terse record to `KNOWLEDGE.md`, then run `pnpm knowledge:size`.
- New spec-ambiguity resolution? Add a `DD-*` to `docs/DOMAIN-DECISIONS.md` and reference
  it from the code.
- Keep tests green and add tests with every change.
