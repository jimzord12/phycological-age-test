# Reflective Maturity Profile

A privacy-first web app for reflecting on maturity-related behaviors. It combines a
deterministic, reproducible questionnaire score with optional narrative exercises and an
optional AI-assisted interpretation.

> Reflective Maturity Profile is a self-reflection tool, not a diagnosis or a scientifically
> validated measure of literal psychological age. Results depend on self-report, context,
> and interpretation.

The repository retains its original `phycological-age-test` name for now; **Reflective
Maturity Profile** is the sole product name.

## Status

Version 1 is under active development and has not been deployed. The implemented flow
currently covers consent, the 24-item questionnaire, two optional narrative exercises,
review, deterministic scoring/results, export, and start-over behavior. The questionnaire
and scoring APIs, provider-agnostic AI adapters, and safety classification are also present.

The AI analysis endpoint, cross-cutting hardening, E2E/accessibility coverage, and delivery
documentation remain. See [`PROGRESS.md`](PROGRESS.md) for authoritative delivery status
and [`docs/Handoff.md`](docs/Handoff.md) for current working context.

## Product principles

- Deterministic scores are computed server-side and cannot be changed by AI.
- AI is optional and disabled by default.
- Raw narrative text is not intended for persistent storage or logging.
- No accounts, ads, lead generation, or upselling.
- Accessibility, graceful failure, and clear non-clinical language are requirements.

## Tech stack

- Next.js 16 and React 19
- TypeScript in strict mode
- Zod for runtime validation
- Vitest for tests; Playwright is planned for E2E coverage
- pnpm 10 and Node.js 22+

## Getting started

```bash
pnpm install
pnpm dev              # http://localhost:3000
```

Copy `.env.example` to `.env.local` when local configuration is needed. No provider
credentials are required for the deterministic flow.

## Validation

```bash
pnpm check            # format, lint, typecheck, coverage, and production build
pnpm test:watch       # tests in watch mode
pnpm test:coverage    # tests with coverage
```

## Repository guide

- [`AGENTS.md`](AGENTS.md): canonical contributor and agent instructions.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): local setup and contribution workflow.
- [`PROGRESS.md`](PROGRESS.md): milestone and issue status; the delivery source of truth.
- [`docs/Handoff.md`](docs/Handoff.md): rolling working context and next steps.
- [`KNOWLEDGE.md`](KNOWLEDGE.md): project-specific quirks and debugging traps.
- [`docs/DOMAIN-DECISIONS.md`](docs/DOMAIN-DECISIONS.md): versioned resolutions for domain
  ambiguities.
- [`docs/issues/`](docs/issues/README.md): scoped implementation work items.

The external domain and product specifications govern questionnaire meaning, wording,
score maps, formulas, and interpretation. Changes to those contracts require the relevant
questionnaire, scoring, or prompt version increment.
