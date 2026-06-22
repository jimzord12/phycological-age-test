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

**Phase 0, Phase A, I003, I004, and I005 (Phase B) are complete. 119 tests pass.**

- Phase 0: pure domain layer — canonical bank, scoring, confidence, narrative scoring.
- I001: `GET /api/v1/questionnaire` (score-free, Zod-validated, cached).
- I002: `POST /api/v1/assessments/score` — server-side recompute, opaque `assessmentId`,
  typed error responses, 17 contract tests.
- I003: Client assessment state + session persistence — done.
- I004: Landing + consent screens — done.
- I005: Questionnaire shell + structured item UI — done.

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
- **`src/app/`** (I004 + I005) — live landing + consent + questionnaire flow:
  - `client-providers.tsx` — `ClientProviders` wraps `AssessmentProvider`; added to
    `layout.tsx` so every page can use `useAssessment()`.
  - `_home-flow.tsx` — client component; routes by `state.phase` + `state.stepIndex`.
    Phase "questionnaire" → `<QuestionnaireShell />`. Phase "narrative" shows I006
    placeholder. Phases "review"/"submitted" show I007–I008 placeholders.
  - `_landing-screen.tsx` — title, privacy summary, expandable "How scoring works",
    disclaimer, "Start assessment" button. Shows version-mismatch banner if needed.
  - `_consent-screen.tsx` — adult + non-clinical required checkboxes; AI opt-in with
    consent copy always shown adjacent; age-metaphor toggle with disclosure; privacy link;
    Continue (disabled until both required checks pass).
  - `_version-mismatch-banner.tsx` — export/discard UI for stale drafts.
  - `_questionnaire-shell.tsx` — 24-item structured questionnaire UI (I005):
    - Progress bar: "Step X of 26" (accounts for 2 narrative steps at 9 and 16).
    - Dimension label shown next to step count (no score direction).
    - `role="radiogroup"` labeled by question heading (h2 with `tabIndex={-1}`).
    - Each option: `<label>` wrapping `<input type="radio">`, ≥ 44px touch target,
      accent highlight when selected, NA option visually muted.
    - Back / Continue (disabled without answer) / "Finish questions" on last item.
    - "Exit and delete current answers" with `window.confirm` guard.
    - Narrative placement hooks: after item 8 → narrative/0 (N01); after item 14 →
      narrative/1 (N02); after item 24 → review/0 (DOMAIN §6.3).
    - Back at index 8 → narrative/0; at index 14 → narrative/1; at index 0 → consent/1.
    - Exports `toVisualStep`, `nextOnContinue`, `nextOnBack` for unit testing.
    - Tests: 16 cases covering visual step mapping and all navigation transitions.
  - `page.tsx` — renders `<HomeFlow />`.
- Docs: `docs/DOMAIN-DECISIONS.md` (DD-1..DD-5), `PROGRESS.md`, `docs/issues/` (I001–I019),
  `AGENTS.md`, `KNOWLEDGE.md`.

What does **not** exist yet: narrative/review/results UI (I006–I009),
AI layer, safety service, observability, E2E/a11y tests.

## Git / environment

- Repo: `jimzord12/phycological-age-test`. Working branch: `claude/next-open-task-hwuro4`.
- `pnpm install` → `pnpm test` / `pnpm typecheck` / `pnpm build`. Node ≥ 22.
- `jsdom` is a devDependency (I003). Use `// @vitest-environment jsdom` for DOM test files.

## Recommended next steps

1. **I006** — Narrative exercise UI. The two narrative exercises (N01, N02) are already
   wired to phase "narrative" stepIndex 0/1 by the questionnaire shell. I006 needs to:
   - Render each exercise title, intro, and textarea fields with word counts.
   - Enforce per-field `maxWords` caps (soft warning or hard cap).
   - Dispatch `SET_NARRATIVE_FIELD` on change (already in the reducer).
   - Continue → transition back to "questionnaire" at stepIndex 8 (after N01) or
     stepIndex 14 (after N02), then to "review" after N02.
2. I007 (review) → I008 (results) follow naturally after I006.
3. **I019** (CI pipeline) — can be done at any time; no dependencies. Single
   `.github/workflows/ci.yml` file: install → typecheck → test → build, triggered on push
   and PR. Good quick win between heavier Phase B issues.
4. The AI layer (I010 → I012 → I011) only after Phase B is solid (PRD §25).

## Things to keep in mind (gotchas → see KNOWLEDGE.md for detail)

- **`_home-flow.tsx` placeholder:** when `state.phase` is "narrative", "review", or
  "submitted", a placeholder renders. I006–I008 replace these.
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
