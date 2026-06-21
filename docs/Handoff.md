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

**Phase 0 (deterministic scoring core) is complete and verified.** The repo is a fresh
Next.js 16 + React 19 + TypeScript app. The pure domain layer (`src/domain/`) implements the
full RMP-1.0 questionnaire bank, deterministic scoring, confidence, and narrative scoring,
with **45 passing unit tests**. Typecheck and production build are green.

What exists today:
- `src/domain/` — canonical bank (24 structured items + 2 narrative exercises, server-owned
  scores), `scoreStructuredAssessment`, `calculateConfidence`, `calculateNarrativeScore`,
  `calculateAgeMetaphor`, typed `validateAnswerSet`, `getPublicQuestionnaire` (score-free).
- `src/app/` — placeholder landing only (title + disclaimer). No questionnaire UI yet.
- Docs: `docs/DOMAIN-DECISIONS.md` (DD-1..DD-4), `PROGRESS.md` (status), `docs/issues/`
  (I001–I018), `AGENTS.md` (canonical guide), `KNOWLEDGE.md` (quirks).

What does **not** exist yet: any `/api/v1` route, the client questionnaire flow, the AI
layer, safety service, observability, E2E/a11y tests. All of it is decomposed in
`docs/issues/`.

## Git / environment

- Repo: `jimzord12/phycological-age-test`. Working branch:
  `claude/implementation-clarification-ctig2d`, branched off `main`.
- The sibling `nextjs-ai-template` repo is mounted in context but is **not** this project;
  its `CLAUDE.md` is unrelated. Do all work here. Don't open a PR unless asked.
- `pnpm install` → `pnpm test` / `pnpm typecheck` / `pnpm build`. Node ≥ 22.

## Recommended next steps

1. **I001 + I002** (API foundation) — these unblock the entire client flow and sit directly
   on the verified domain core. `GET /api/v1/questionnaire` (must stay score-free) and
   `POST /api/v1/assessments/score` (recompute server-side; return opaque `assessmentId`).
2. Then the Phase B client flow (I003 → I008), which is where the app becomes usable.
3. The AI layer (I010 → I012 → I011) only **after** deterministic scoring + graceful
   fallback are solid (PRD §25). It is provider-agnostic; the intended provider (Z.AI GLM
   Coding Plan) speaks the **Anthropic Messages** protocol, so the Anthropic-style adapter
   covers it via a configurable base URL.

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
