# Project Progress — Reflective Maturity Profile

Single source of truth for delivery status. Tracks the PRD §25 implementation sequence and
maps remaining work to the self-contained issues in [`docs/issues/`](docs/issues/README.md).

**Legend:** ✅ done · 🟡 in progress · ⬜ not started

Last updated: 2026-06-28 (I016 ✅)

---

## Milestone overview

| Phase | Theme                                                                 | Status     |
| ----- | --------------------------------------------------------------------- | ---------- |
| 0     | Domain core: types, canonical bank, deterministic scoring + tests     | ✅ done    |
| A     | API foundation: questionnaire + score endpoints                       | ✅ done    |
| B     | Client flow: consent → questionnaire → review → deterministic results | ✅ done    |
| C     | AI layer: provider abstraction, analyze endpoint, safety service      | ✅ done    |
| D     | Cross-cutting: observability, rate limiting, security hardening, CI   | ✅ done    |
| E     | QA: E2E journeys, accessibility suite, AI evaluation set              | 🟡 partial |
| F     | Delivery: privacy policy draft, threat model, deployment docs         | ⬜         |

---

## Completed (Phase 0)

- ✅ Fresh Next.js 16 + React 19 + TypeScript (strict) scaffold; production build green.
- ✅ Domain types as discriminated unions; canonical version identifiers
  (`RMP-1.0` / `RMP-SCORE-1.0` / `RMP-AI-1.0`).
- ✅ Canonical RMP-1.0 question bank (24 structured items + 2 narrative exercises) with
  server-owned, client-hidden score maps; score-free public projection.
- ✅ Deterministic scoring: dimension normalization, reportability thresholds (NA excluded
  from denominator), Structured Maturity Index, profile balance, opt-in age metaphor.
- ✅ Confidence calculation with machine-readable reason codes, reported separately.
- ✅ Application-side narrative scoring (model never decides the score).
- ✅ Typed answer-set validation (version/unknown/duplicate/option errors).
- ✅ Unit coverage for every canonical option score and scoring boundaries (PRD §21.1).
- ✅ Domain ambiguities formalized in [`docs/DOMAIN-DECISIONS.md`](docs/DOMAIN-DECISIONS.md)
  (DD-1 null index, DD-2 narrative confidence, DD-3 profile balance, DD-4 consistency).

---

## Remaining work → issues

| Issue                                                | Title                                                   | Phase | Depends on       | Complexity |
| ---------------------------------------------------- | ------------------------------------------------------- | ----- | ---------------- | ---------- |
| [I001](docs/issues/I001-questionnaire-api.md)        | `GET /api/v1/questionnaire` (score-free)                | A     | Phase 0          | ✅         |
| [I002](docs/issues/I002-score-api.md)                | `POST /api/v1/assessments/score` + validation           | A     | Phase 0          | ✅         |
| [I003](docs/issues/I003-client-state-persistence.md) | Client assessment state + session persistence           | B     | I001             | ✅         |
| [I004](docs/issues/I004-landing-consent.md)          | Landing + consent + eligibility/AI/age-metaphor choices | B     | I003             | ✅         |
| [I005](docs/issues/I005-questionnaire-shell.md)      | Questionnaire shell + structured item UI (a11y)         | B     | I003             | ✅         |
| [I006](docs/issues/I006-narrative-ui.md)             | Narrative exercise UI (optional, word caps)             | B     | I005             | ✅         |
| [I007](docs/issues/I007-review-screen.md)            | Review screen                                           | B     | I005, I006       | ✅         |
| [I008](docs/issues/I008-deterministic-results.md)    | Deterministic results screen (text equivalents)         | B     | I002, I003       | ✅         |
| [I009](docs/issues/I009-export-start-over.md)        | Export (HTML/JSON) + start over                         | B     | I008             | ✅         |
| [I010](docs/issues/I010-ai-provider-abstraction.md)  | Provider-agnostic AI abstraction + adapters             | C     | Phase 0          | ✅         |
| [I011](docs/issues/I011-analyze-api.md)              | `POST /api/v1/assessments/analyze` + strict schema      | C     | I002, I010, I012 | ✅         |
| [I012](docs/issues/I012-safety-service.md)           | Safety service + help-resource selection                | C     | Phase 0          | ✅         |
| [I013](docs/issues/I013-observability-rate-limit.md) | Privacy-safe observability + rate limiting              | D     | I002             | ✅         |
| [I014](docs/issues/I014-security-hardening.md)       | Security hardening (CSP, escaping, limits)              | D     | I002, I008       | ✅         |
| [I015](docs/issues/I015-e2e-tests.md)                | E2E test journeys (Playwright)                          | E     | I008, I009, I011 | 4          |
| [I016](docs/issues/I016-accessibility-suite.md)      | Accessibility test suite + audit                        | E     | I008             | ✅         |
| [I017](docs/issues/I017-ai-eval-fixtures.md)         | AI evaluation fixtures + harness                        | E     | I011             | 3          |
| [I018](docs/issues/I018-delivery-docs.md)            | Privacy policy draft, threat model, deployment docs     | F     | —                | 2          |
| [I019](docs/issues/I019-ci-pipeline.md)              | Minimal CI pipeline (GitHub Actions)                    | D     | —                | ✅         |

Complexity is 1–5 (per the project's complexity-rating convention). No item is rated 5;
if one grows during implementation, decompose it before starting.

## Token-cost estimates

Rough per-issue token consumption for an AI agent session. Based on I001 actual (~20K)
as the calibration point. Treat as order-of-magnitude guidance, not a guarantee — edge
cases and iteration rounds can push any issue up a tier.

**Tier legend:**

| Tier | Approx. tokens | Typical drivers                                        |
| ---- | -------------- | ------------------------------------------------------ |
| XS   | 10–30K         | Docs or a single small file                            |
| S    | 30–70K         | One API route or a simple UI screen                    |
| M    | 70–130K        | Multiple files, non-trivial logic, solid test coverage |
| L    | 130–220K       | Complex UI with accessibility, many states/paths       |
| XL   | 220K+          | Many interdependent pieces; iteration rounds likely    |

| Issue   | Title                              | Tier   | Key reason                                                          |
| ------- | ---------------------------------- | ------ | ------------------------------------------------------------------- |
| I001 ✅ | `GET /api/v1/questionnaire`        | **XS** | Done — ~20K actual                                                  |
| I002    | `POST /api/v1/assessments/score`   | **S**  | One route, Zod validation, domain wiring, error types               |
| I003    | Client state + session persistence | **M**  | React context/store, debounce, version-mismatch logic               |
| I004    | Landing + consent UI               | **S**  | Two screens, form validation, state integration                     |
| I005    | Questionnaire shell + a11y         | **L**  | 26-step flow, keyboard nav, focus management, radio groups          |
| I006    | Narrative exercise UI              | **S**  | Word counting, caps, skip logic                                     |
| I007    | Review screen                      | **S**  | Display-only, completion counts, jump-to-item                       |
| I008    | Deterministic results screen       | **L**  | Many null/insufficient states, charts + text equivalents, a11y      |
| I009    | Export + start over                | **S**  | HTML/JSON serialisation, confirmation dialog                        |
| I010    | AI provider abstraction            | **M**  | Interface + 2 adapters, env config, mocking                         |
| I011    | `POST /api/v1/assessments/analyze` | **XL** | Prompt assembly, strict schema, safety integration, 4 result states |
| I012    | Safety service                     | **M**  | Two-layer classification, help-resource selection                   |
| I013    | Observability + rate limiting      | **S**  | Structured events, scrubber, rate-limit middleware                  |
| I014    | Security hardening                 | **M**  | CSP headers, escaping audit, CI scanning                            |
| I015    | E2E test journeys (Playwright)     | **XL** | 13 journeys, Playwright setup, mocked AI layer                      |
| I016 ✅ | Accessibility suite + audit        | **M**  | axe-core integration, manual check docs                             |
| I017    | AI evaluation fixtures + harness   | **M**  | Synthetic fixtures, eval metrics, harness runner                    |
| I018    | Delivery docs                      | **XS** | Prose only — privacy policy draft, threat model, deploy guide       |
| I019    | CI pipeline                        | **XS** | Single YAML file; no new logic or test infrastructure               |

---

## Definition of Done (PRD §27)

A production build deploys with AI disabled or enabled; an anonymous adult completes the
full flow; deterministic results are domain-correct and reproducible; AI analysis is
evidence-grounded and schema-valid; privacy defaults are enforced; accessibility criteria
pass; and the test suite covers the critical scoring and failure paths.
