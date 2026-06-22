# AGENTS.md

Canonical guide for any agent (or human) working in this repository. Read this first.
`CLAUDE.md` is just a pointer to this file.

---

## 1. Project vision & purpose

**Reflective Maturity Profile** (working public title: *Psychological Age Test*) is a
privacy-first web app that guides an adult through a reflective self-assessment of
maturity-related behaviors and returns a **deterministic** maturity profile, plus an
**optional**, clearly-qualified AI-assisted narrative analysis.

It is built mainly for fun, but it must behave honestly. The product prioritizes
**honesty, privacy, accessibility, reproducibility, and graceful failure over engagement
metrics**. It is explicitly **not** a clinical tool, not a diagnosis, and not a literal
measure of psychological age. It is free: no ads, no lead-gen, no upsell, no accounts.

The deterministic scoring is the product's spine. The AI layer is an enhancement that must
never block, alter, or gate the deterministic results.

## 2. Source of truth & precedence

Two external documents govern the domain (kept with the project handoff, not in-repo):

1. `Psychological-Maturity-Questionnaire.DOMAIN.md` — authoritative for questionnaire
   meaning, wording, score maps, formulas, rubric, confidence, and interpretation.
2. `Psychological-Maturity-App.PRD.md` — product + technical specification.

**Precedence when requirements conflict** (PRD §2): DOMAIN rules → PRD safety/privacy/
security → PRD acceptance criteria → PRD UX → PRD architecture → implementer choices.

Where those docs are silent or ambiguous, resolutions live in
[`docs/DOMAIN-DECISIONS.md`](docs/DOMAIN-DECISIONS.md) (the `DD-*` records).

## 3. Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript** strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax` — see KNOWLEDGE.md)
- **Zod** for runtime validation (used as API layers land)
- **Vitest** for unit tests; Playwright planned for E2E (issue I015)
- **pnpm** (pinned `packageManager`), Node ≥ 22

## 4. Architecture & file layout

```
src/
  app/                      # Next.js App Router (UI + /api/v1 routes as they land)
    api/v1/                 # questionnaire (I001), assessments/score (I002), analyze (I011)
    layout.tsx, page.tsx, globals.css
  domain/                   # PURE, framework-free domain core (see dependency rule)
    versions.ts             # RMP-1.0 / RMP-SCORE-1.0 / RMP-AI-1.0 identifiers
    result-types.ts         # discriminated-union result types
    questionnaire.ts        # canonical 24-item bank + 2 narrative exercises (server-owned scores)
    scoring.ts              # validation, dimension scoring, SMI, profile balance, age metaphor
    confidence.ts           # confidence score + machine-readable reasons
    narrative-rubric.ts     # word counts, content thresholds, narrative score
    *.test.ts               # co-located unit tests
  server/                   # (planned) ai-provider, analysis-service, safety-service, rate-limit, logging
docs/
  DOMAIN-DECISIONS.md       # DD-* clarifications for spec gaps
  Handoff.md                # rolling agent-to-agent handoff (read on arrival)
  issues/                   # I001–I018 self-contained work items + README
PROGRESS.md                 # delivery status / milestone tracker (root)
KNOWLEDGE.md                # project quirks & edge cases (root)
scripts/check-knowledge-size.sh
```

**Dependency rule (PRD §12):** UI and API may import from `src/domain/`. `src/domain/` must
**not** import framework, database, network, or AI-provider code. Keep it pure (no `Date`,
no network, no I/O) so results are deterministic and testable.

## 5. The do's and don'ts

**Do**
- Read `docs/Handoff.md` first, then `PROGRESS.md` and the relevant `docs/issues/` file.
- Keep `pnpm check`-equivalents green: run `pnpm test` and `pnpm typecheck` before committing.
- Add tests with every change; co-locate `*.test.ts` next to the code.
- Preserve domain identifiers and version values exactly.
- Land work as the vertical slices described in `docs/issues/`; update `PROGRESS.md` status.
- Record newly-discovered quirks in `KNOWLEDGE.md` with a detector test where practical,
  then run the size script (full routine in §6).
- Document any necessary deviation as a new `DD-*` in `docs/DOMAIN-DECISIONS.md`.
- **Prefer one branch per issue** — when starting a new issue, recommend creating a
  dedicated branch rather than piling work onto the current branch. This keeps diffs
  reviewable and makes it easy to isolate or revert a single issue. Not a hard rule —
  use judgment when issues are trivially small or tightly coupled.
- **Branch naming convention** — branch names **must** include the issue or task identifier
  whenever one exists. Use the format `<type>/<identifier>-<short-slug>`, e.g.:
  - `feat/I005-questionnaire-shell`
  - `fix/I002-score-validation`
  - `chore/I014-csp-headers`

  Common types: `feat` (new feature/issue), `fix` (bug fix), `chore` (docs, config,
  tooling), `refactor`. The identifier portion (`I001`–`I018`, or a task ID) is
  **required** when the work is tied to a known issue; omit it only for truly ad-hoc
  branches with no associated issue.

**Don't**
- Don't change question wording, answer order, score maps, formulas, rubric rules, or the
  AI prompt without a **version increment** (DOMAIN §17). These are not free edits.
- Don't expose numeric option scores to the client (use `getPublicQuestionnaire()`).
- Don't trust client-computed scores; always recompute server-side.
- Don't let the AI decide or modify any deterministic score, ever.
- Don't add accounts, ads, trackers, persistent raw-answer storage, or client-side provider
  calls. No provider secret in any client artifact, prompt, or log.
- Don't persist or log raw narrative text; treat it as untrusted input (prompt injection).
- Don't open a PR unless explicitly asked.

## 6. Mental model — Handoff.md & KNOWLEDGE.md

These two files exist so each agent starts where the last one left off and the project feels
like one developer built it.

- **`docs/Handoff.md`** — narrative continuity: current state, what just happened, what to do
  next, open questions, and any warnings. Update it at the end of a working session.
- **`KNOWLEDGE.md`** — terse catalogue of *quirks/edge cases* discovered only by working on
  the project (e.g. a tooling gotcha). These are NOT architecture decisions (those go to
  `docs/DOMAIN-DECISIONS.md`) — they are infrastructure/behavior surprises that would
  otherwise cost the next agent a debug loop. Keep each record short and to the point.

**Required routine for KNOWLEDGE.md:**

1. Add the record (terse — see the format in `KNOWLEDGE.md`).
2. **If practical, add a detector test** in `src/quirks.test.ts` (titled `K: ...`) that
   fails when the quirk no longer holds, and reference it from the record's `Detector` line.
   This gives a cheap signal when an upstream fix lands so the entry can be **retired** (when
   a detector fails because the quirk is gone, delete the entry and its detector together).
   If a quirk can't be cheaply tested, write `Detector: none — verify manually`.
3. **Then, and only then**, run:

   ```bash
   pnpm knowledge:size      # or: bash scripts/check-knowledge-size.sh
   ```

If the file is above **150 KB**, add a note at the top of `docs/Handoff.md` instructing the
next agent that their **first** action is to compress and distill `KNOWLEDGE.md` before
doing anything else. Do not let it grow unbounded.

## 7. Quick start

```bash
pnpm install          # Node >= 22
pnpm test             # unit tests (Vitest)
pnpm typecheck        # tsc --noEmit
pnpm build            # production build (Next 16)
pnpm dev              # http://localhost:3000 (placeholder landing for now)
```

The app must always run with **AI disabled** (the default). Copy `.env.example` to
`.env.local`; no secrets are needed for deterministic scoring. The intended AI provider is
the **Z.AI GLM Coding Plan**, which exposes an **Anthropic Messages-compatible** endpoint —
the AI layer is provider-agnostic (issue I010).
