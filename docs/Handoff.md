# Handoff

Rolling agent-to-agent handoff. **Read this first** on arrival, then `PROGRESS.md` and the
relevant file in `docs/issues/`. Goal: make the project feel like one developer built it.
Update this file at the end of your session (replace stale "what's next" with reality).

> If `pnpm knowledge:size` ever reports KNOWLEDGE.md is over 150 KB, a note will appear at
> the **top** of this file. If you see one, your first action is to compress/distill
> KNOWLEDGE.md before anything else.

_Last updated: 2026-06-22_

---

## Where things stand

**Phase 0, Phase A, I003, and I004 (Phase B) are complete. 103 tests pass.**

- Phase 0: pure domain layer — canonical bank, scoring, confidence, narrative scoring.
- I001: `GET /api/v1/questionnaire` (score-free, Zod-validated, cached).
- I002: `POST /api/v1/assessments/score` — server-side recompute, opaque `assessmentId`,
  typed error responses, 17 contract tests.
- I003: Client assessment state + session persistence — done.
- I004: Landing + consent screens — done.

What exists today:
- `src/domain/` — canonical bank (24 structured + 2 narrative), `scoreStructuredAssessment`,
  `calculateConfidence`, `calculateNarrativeScore`, `calculateAgeMetaphor`,
  `validateAnswerSet`, `getPublicQuestionnaire`.
- `src/app/api/v1/questionnaire/route.ts` — `GET /api/v1/questionnaire`.
- `src/app/api/v1/assessments/score/route.ts` — `POST /api/v1/assessments/score`.
  Exports `processScoreRequest` (tested directly) and `ScoreResponseSchema`.
- **`src/client/`** (I003):
  - `assessment-state.ts`, `storage.ts`, `assessment-context.tsx`, `use-questionnaire.ts`.
  - Tests: `assessment-state.test.ts` (18 tests), `storage.test.ts` (10 tests).
- **`src/app/`** (I004) — live landing + consent flow:
  - `client-providers.tsx` — `ClientProviders` wraps `AssessmentProvider`; added to
    `layout.tsx` so every page can use `useAssessment()`.
  - `_home-flow.tsx` — client component; routes by `state.phase` + `state.stepIndex`.
  - `_landing-screen.tsx` — title, privacy summary, expandable "How scoring works",
    disclaimer, "Start assessment" button. Shows version-mismatch banner if needed.
  - `_consent-screen.tsx` — adult + non-clinical required checkboxes; AI opt-in with
    consent copy always shown adjacent; age-metaphor toggle with disclosure; privacy link;
    Continue (disabled until both required checks pass).
  - `_version-mismatch-banner.tsx` — export/discard UI for stale drafts.
  - `page.tsx` — renders `<HomeFlow />`.
- Docs: `docs/DOMAIN-DECISIONS.md` (DD-1..DD-5), `PROGRESS.md`, `docs/issues/` (I001–I018),
  `AGENTS.md`, `KNOWLEDGE.md`.

What does **not** exist yet: questionnaire/narrative/review/results UI (I005–I009),
AI layer, safety service, observability, E2E/a11y tests.

## Git / environment

- Repo: `jimzord12/phycological-age-test`. Working branch: `claude/next-open-task-hwuro4`.
- `pnpm install` → `pnpm test` / `pnpm typecheck` / `pnpm build`. Node ≥ 22.
- `jsdom` is a devDependency (I003). Use `// @vitest-environment jsdom` for DOM test files.

## Recommended next steps

1. **I005** — Questionnaire shell + structured item UI (a11y). This is the next Phase B item.
   - `_home-flow.tsx` already has a placeholder for `phase === "questionnaire"` — replace
     it with the real questionnaire component.
   - Use `useAssessment()` and `useQuestionnaire()` from `src/client/` — no wiring needed.
   - 26 steps (24 structured questions + intro + maybe progress bar). Focus on keyboard nav
     and radio group accessibility.
2. I006 (narrative UI) → I007 (review) → I008 (results) follow naturally after I005.
3. The AI layer (I010 → I012 → I011) only after Phase B is solid (PRD §25).

## Things to keep in mind (gotchas → see KNOWLEDGE.md for detail)

- **`_home-flow.tsx` placeholder:** when `state.phase !== "consent"`, a placeholder renders.
  I005 replaces this with the real questionnaire component.
- **Non-clinical acknowledgement is local state only.** In `_consent-screen.tsx`, the
  `nonClinicalAcknowledged` checkbox is React local state (not persisted). If the user
  refreshes while in phase "consent" stepIndex 1, they'll need to re-check it. This is
  intentional — it gates entry, and the phase advances only after both checks pass.
- **Version mismatch shown on landing.** The banner is in `_landing-screen.tsx`. After
  discard/export, `versionMismatch` goes to `null` and the landing appears normally.
- **`use-questionnaire.ts` module cache:** the `moduleCache` variable resets on full page
  load but persists across re-renders. Mock or clear in tests that import this module.
- **Don't assume option "C" is the best answer.** The bank is behaviorally anchored; some
  items are midpoint-optimal (e.g. ER03 C=3, TD04 A=2). Derive max/min from the score map.
- `next build` will rewrite `tsconfig.json` (`jsx: react-jsx`, extra `include`). Expected.
- Strict TS: `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. Domain layer must stay
  pure (no `Date`, network, or framework imports — PRD §12 dependency rule).
- Two spec gaps resolved: SMI is `null` when any dimension is insufficient (DD-1), narrative
  confidence is `moderate` when exactly one exercise meets threshold (DD-2).

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
