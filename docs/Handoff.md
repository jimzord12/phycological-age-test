# Handoff

Rolling working context for the next contributor. **Read this first**, then
[`PROGRESS.md`](../PROGRESS.md) and the relevant file in [`docs/issues/`](issues/README.md).
Update this file at the end of a working session; keep detailed delivery history in Git and
status tracking in `PROGRESS.md` rather than duplicating it here.

> If `pnpm knowledge:size` reports that `KNOWLEDGE.md` exceeds 150 KB, add a notice at the
> top of this file requiring the next contributor to distill it before other work.

_Last updated: 2026-06-22 (documentation audit)_

## Current state

Reflective Maturity Profile v1 is under development and has not been deployed.

- Phase 0 and API/client Phases A and B (I001–I009) are complete.
- The AI provider abstraction (I010) and safety service (I012) are complete.
- The deterministic journey works from consent through questionnaire, optional narratives,
  review, results, export, and start over.
- `GET /api/v1/questionnaire` and `POST /api/v1/assessments/score` are implemented.
- AI remains disabled by default and cannot modify deterministic scores.

The authoritative issue-by-issue status is in [`PROGRESS.md`](../PROGRESS.md).

## Next implementation target

I011, `POST /api/v1/assessments/analyze`, is the next major vertical slice. Its dependencies
are complete: deterministic scoring (I002), provider abstraction (I010), and safety
classification (I012). The endpoint still needs prompt assembly, strict output handling,
safety integration, and graceful result states.

After I011, remaining work includes privacy-safe observability/rate limiting, security
hardening, CI/tooling follow-through, E2E and accessibility coverage, AI evaluation, and
delivery/privacy documentation. Confirm exact ordering in `PROGRESS.md` before starting.

## Environment

- Repository: `jimzord12/phycological-age-test` (the repository typo is intentionally
  unchanged for now).
- Product name: **Reflective Maturity Profile**.
- Runtime: Node.js 22+, pnpm 10.
- Setup: `pnpm install`, then use `pnpm check` for formatting, linting, typechecking,
  coverage tests, and the production build.
- Local AI credentials are optional; deterministic behavior must work with
  `AI_PROVIDER=none`.

Dependencies are not installed in every checkout. A missing `node_modules` directory means
validation commands cannot run until `pnpm install` completes.

## Active cautions

- Do not infer option quality from its letter; canonical options are behaviorally anchored.
- Do not expose server-owned option scores or trust client-computed scores.
- Do not let AI output alter deterministic scoring.
- Do not persist or log raw narrative text.
- `next build` may reconcile `tsconfig.json`; see [`KNOWLEDGE.md`](../KNOWLEDGE.md).
- Strict TypeScript settings include `noUncheckedIndexedAccess` and
  `verbatimModuleSyntax`.

## Session close-out

- Update `PROGRESS.md` when issue status changes.
- Replace stale current-state/next-step text in this handoff.
- Record only genuine implementation surprises in `KNOWLEDGE.md`, then run
  `pnpm knowledge:size`.
- Record domain ambiguity resolutions in `docs/DOMAIN-DECISIONS.md`.
- Do not open a pull request unless explicitly requested.
