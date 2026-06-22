# Handoff

Rolling agent-to-agent handoff. **Read this first** on arrival, then `PROGRESS.md` and the
relevant file in `docs/issues/`. Goal: make the project feel like one developer built it.
Update this file at the end of your session (replace stale "what's next" with reality).

> If `pnpm knowledge:size` ever reports KNOWLEDGE.md is over 150 KB, a note will appear at
> the **top** of this file. If you see one, your first action is to compress/distill
> KNOWLEDGE.md before anything else.

_Last updated: 2026-06-22 (I010 landed)_

---

## Where things stand

**Phase 0, Phase A, Phase B (I001–I009), and I010 are complete. 224 tests pass.**

- Phase 0: pure domain layer — canonical bank, scoring, confidence, narrative scoring.
- I001: `GET /api/v1/questionnaire` (score-free, Zod-validated, cached).
- I002: `POST /api/v1/assessments/score` — server-side recompute, opaque `assessmentId`,
  typed error responses, 17 contract tests.
- I003: Client assessment state + session persistence — done.
- I004: Landing + consent screens — done.
- I005: Questionnaire shell + structured item UI — done.
- I006: Narrative exercise UI — done.
- I007: Review screen — done.

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
  - **`_narrative-shell.tsx`** (I006): two optional narrative exercises (N01, N02):
    - Progress bar shows step 9/26 (N01) or 16/26 (N02); "OPTIONAL" badge.
    - Exercise title, intro text, and per-field textareas with live word counts.
    - 80% warning (yellow); hard cap at `maxWords` via controlled textarea — rejects changes
      that would push word count over the limit without losing existing text.
    - Privacy notice below fields.
    - Back / Continue / "Skip this exercise" buttons. Skip and Continue navigate identically;
      the exercise is always optional (no required answers).
    - Navigation: N01 Back → questionnaire/7; N01 Continue → questionnaire/8; N02 Back →
      questionnaire/13; N02 Continue → review/0.
    - Pure helpers `narrativeBack`, `narrativeContinue`, `NARRATIVE_VISUAL_STEPS` exported
      and covered by 10 unit tests in `_narrative-shell.test.ts`.
  - `_home-flow.tsx` updated to route `phase === "narrative"` → `<NarrativeShell />`, `phase === "review"` → `<ReviewScreen />`, and `phase === "submitted"` → `<ResultsScreen />`.
  - **`_review-screen.tsx`** (I007): review screen before submission:
    - Per-dimension completion counts (answered / N/A / unanswered) with amber border when any unanswered.
    - All 24 structured questions listed (grouped by dimension) with status tags and "Edit" buttons that jump directly to that question.
    - Both narrative exercises shown with Complete / Partial / Skipped status and "Edit" buttons.
    - Choices summary (AI analysis, age metaphor) shown read-only.
    - Back → narrative/1 (N02); Submit → `phase: "submitted"` (score API call is I008's job).
    - Pure helpers `getNarrativeStatus`, `getQuestionStatus`, `getDimensionSummary` exported and covered by 18 unit tests in `_review-screen.test.ts`.
  - **`_results-screen.tsx`** (I008): deterministic results screen:
    - Calls `POST /api/v1/assessments/score` on mount; shows loading → success/error states.
    - Non-clinical disclaimer always shown at top.
    - Structured Maturity Index: large number (0–100) or "Index unavailable" state (DD-1).
    - Five dimension cards: reportable → score + horizontal bar + band label (DD-6: Emerging/Developing/Established/Proficient/Integrated); insufficient → "Insufficient data" with how many more answers needed.
    - Profile balance label + spread when not null.
    - Strength & Development Areas: strongest dimension + up to 2 lower dimensions (DOMAIN §12.3).
    - Confidence section: label + score + human-readable reasons list.
    - Age metaphor: only when `preferences.includeAgeMetaphor` is true AND `ageMetaphor` is not null; always shows qualifying copy.
    - AI analysis placeholder (I011 slot) and Export/Start over actions (I009 slot).
    - All bar charts have `role="img"` with `aria-label` text equivalent.
    - Exports `getBandLabel`, `getGrowthAreas`, `formatConfidenceReason` for testing (22 unit tests in `_results-screen.test.ts`).
- Docs: `docs/DOMAIN-DECISIONS.md` (DD-1..DD-6), `PROGRESS.md`, `docs/issues/` (I001–I019),
  `AGENTS.md`, `KNOWLEDGE.md`.

- **`_export-helpers.ts`** (I009): `escapeHtml`, `buildExportPayload`, `buildJsonExport`,
  `buildHtmlExport`, `triggerDownload`, `exportDateStamp`. Self-contained HTML export with
  inline CSS and `@media print` rule that suppresses dark background. JSON export includes
  version identifiers, disclaimer, and human-readable confidence reasons. 31 unit tests in
  `_export-helpers.test.ts`. Results screen now has "Export JSON", "Export HTML", and
  "Start a new assessment" buttons in the actions area.

- **`src/server/ai-provider.ts`** (I010): provider-agnostic `analyze()` wrapper:
  - Uses Vercel AI SDK v6 (`ai@6`, `@ai-sdk/anthropic`, `@ai-sdk/openai`).
  - `AI_PROVIDER=none` → `{ status: "disabled" }` (default; deterministic flow unblocked).
  - `AI_PROVIDER=anthropic` → `createAnthropic({ baseURL, apiKey })` from env.
  - `AI_PROVIDER=openai` → `createOpenAI({ baseURL, apiKey })` from env.
  - `generateObject()` with `zodSchema(AnalysisOutputSchema)` — no raw JSON parsing.
  - Error classification: `rate_limited` (429), `invalid_output` (schema failure),
    `timeout` (AbortError/TimeoutError), `provider_error` (everything else).
  - `maxRetries: 1`, `abortSignal: AbortSignal.timeout(AI_ANALYSIS_TIMEOUT_MS)`.
  - `AnalysisOutputSchema` exported: 3–5 observations, 2–3 experiments, rubric 0–2,
    penalty 0–2, reviewPeriodDays 7–45.
  - 24 unit tests in `src/server/ai-provider.test.ts`.
  - **Zod v4 + AI SDK v6 note:** Zod v4 implements Standard Schema v1 (`~standard`),
    which AI SDK v6 supports. Use `zodSchema()` from `"ai"` to wrap schemas before
    passing to `generateObject()`.

What does **not** exist yet: safety service (I012), analyze endpoint (I011), observability, E2E/a11y tests.

## Git / environment

- Repo: `jimzord12/phycological-age-test`. Working branch: `claude/bold-babbage-fsfl6p`.
- `pnpm install` → `pnpm test` / `pnpm typecheck` / `pnpm build`. Node ≥ 22.
- `jsdom` is a devDependency (I003). Use `// @vitest-environment jsdom` for DOM test files.

## Recommended next steps

1. **I012** (safety service) — no dependencies within Phase C. Two-layer classification,
   help-resource selection. I011 depends on it, so this unblocks the full AI layer.
2. **I011** (`POST /api/v1/assessments/analyze`) — depends on I010 ✅ + I012. The most
   complex remaining item (XL tier). Prompt assembly, strict schema validation, safety
   integration, 4 result states.

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
