# phycological-age-test

An online **Reflective Maturity Profile** (working title: *Psychological Age Test*) — a
privacy-first, deterministic self-assessment of maturity-related behaviors. Built mainly
for fun, to reflect on whether people today are more (or less) mature than they think. 👴👵

> This is a reflective self-assessment, **not** a diagnosis or a scientifically validated
> measure of literal psychological age. Results depend on self-report, interpretation,
> current circumstances, and how specifically you answer.

## Status

This repository is being built in increments following the project handoff and PRD. The
**current increment delivers the deterministic scoring core** (domain types, the canonical
`RMP-1.0` question bank, and the pure scoring/confidence/narrative functions) with full
unit tests. The questionnaire UI, `/api/v1` endpoints, and the AI analysis layer are
intentionally **not** in this increment (handoff sequence: scoring + tests first).

## Source of truth

The domain is governed by two documents (kept outside this repo):

1. `Psychological-Maturity-Questionnaire.DOMAIN.md` — authoritative for questionnaire
   meaning, wording, score maps, formulas, and interpretation rules.
2. `Psychological-Maturity-App.PRD.md` — product/technical specification.

Question wording, answer order, score maps, rubric rules, and prompt changes require a
**version increment** (`questionnaire_version`, `scoring_version`, `prompt_version`).

## Tech stack

- Next.js 16 + React 19 + TypeScript (strict)
- Zod (runtime validation — used as the API layer is added)
- Vitest (unit tests)

## Getting started

```bash
pnpm install        # Node >= 22, pnpm >= 10
pnpm test           # run the deterministic scoring unit tests
pnpm typecheck      # tsc --noEmit
pnpm dev            # placeholder landing at http://localhost:3000
```

Copy `.env.example` to `.env.local` for local configuration. The app runs fully with **AI
disabled** (the default); no secrets are required for deterministic scoring.

## The domain layer (`src/domain`)

Pure, framework-free modules (PRD §12 dependency rule — `domain/` must not import
framework, database, network, or AI-provider code):

| Module                | Responsibility                                                             |
| --------------------- | ------------------------------------------------------------------------- |
| `versions.ts`         | Canonical `RMP-1.0` / `RMP-SCORE-1.0` / `RMP-AI-1.0` identifiers.          |
| `result-types.ts`     | Discriminated-union result types (no free-form status strings).           |
| `questionnaire.ts`    | Canonical 24-item bank + 2 narrative exercises; server-owned score maps.  |
| `scoring.ts`          | Validation, dimension scoring, Structured Maturity Index, profile balance, age metaphor. |
| `confidence.ts`       | Confidence score, deductions, and machine-readable reasons.               |
| `narrative-rubric.ts` | Word counting, content thresholds, and the application-side narrative score. |

### Key scoring rules (from the Domain document)

- **Dimension score**: `round(((mean - 1) / 4) * 100)` over scored items only.
  `Not applicable` is excluded from the denominator, never scored as immature.
- **Reportable** when ≥ 4 of 5 items answered (≥ 3 of 4 for Identity Stability), else
  `insufficient_data`.
- **Structured Maturity Index**: equal-weighted mean of the five normalized dimensions;
  `null` if any dimension is insufficient.
- **Narrative score**: computed by application code from the model's rubric values
  (the model never decides the score). `not_scored` (never zero) when neither narrative
  exercise meets its word threshold.
- **Confidence** is reported separately from the maturity score and never changes it.

## AI provider direction (next increment)

The AI analysis layer will be **provider-agnostic** behind an `AnalysisProvider`
interface, configured via environment (see `.env.example`). The intended provider is the
**Z.AI GLM Coding Plan**, which exposes an **Anthropic Messages-compatible** endpoint
(`https://api.z.ai/api/anthropic`) — so the same Messages API shape works for Anthropic
and GLM. An OpenAI-compatible adapter is also supported. The model never modifies
deterministic scores; its structured output is validated against a strict schema.

## Testing

```bash
pnpm test            # all unit tests
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage
```
