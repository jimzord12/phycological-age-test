# Project Progress — Reflective Maturity Profile

Single source of truth for delivery status. Tracks the PRD §25 implementation sequence and
maps remaining work to the self-contained issues in [`docs/issues/`](docs/issues/README.md).

**Legend:** ✅ done · 🟡 in progress · ⬜ not started

Last updated: 2026-06-21

---

## Milestone overview

| Phase | Theme | Status |
| ----- | ----- | ------ |
| 0 | Domain core: types, canonical bank, deterministic scoring + tests | ✅ done |
| A | API foundation: questionnaire + score endpoints | ⬜ |
| B | Client flow: consent → questionnaire → review → deterministic results | ⬜ |
| C | AI layer: provider abstraction, analyze endpoint, safety service | ⬜ |
| D | Cross-cutting: observability, rate limiting, security hardening | ⬜ |
| E | QA: E2E journeys, accessibility suite, AI evaluation set | ⬜ |
| F | Delivery: privacy policy draft, threat model, deployment docs | ⬜ |

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
- ✅ 45 unit tests (every canonical option score + scoring boundaries, PRD §21.1).
- ✅ Domain ambiguities formalized in [`docs/DOMAIN-DECISIONS.md`](docs/DOMAIN-DECISIONS.md)
  (DD-1 null index, DD-2 narrative confidence, DD-3 profile balance, DD-4 consistency).

---

## Remaining work → issues

| Issue | Title | Phase | Depends on | Complexity |
| ----- | ----- | ----- | ---------- | ---------- |
| [I001](docs/issues/I001-questionnaire-api.md) | `GET /api/v1/questionnaire` (score-free) | A | Phase 0 | 2 |
| [I002](docs/issues/I002-score-api.md) | `POST /api/v1/assessments/score` + validation | A | Phase 0 | 3 |
| [I003](docs/issues/I003-client-state-persistence.md) | Client assessment state + session persistence | B | I001 | 3 |
| [I004](docs/issues/I004-landing-consent.md) | Landing + consent + eligibility/AI/age-metaphor choices | B | I003 | 3 |
| [I005](docs/issues/I005-questionnaire-shell.md) | Questionnaire shell + structured item UI (a11y) | B | I003 | 4 |
| [I006](docs/issues/I006-narrative-ui.md) | Narrative exercise UI (optional, word caps) | B | I005 | 2 |
| [I007](docs/issues/I007-review-screen.md) | Review screen | B | I005, I006 | 2 |
| [I008](docs/issues/I008-deterministic-results.md) | Deterministic results screen (text equivalents) | B | I002, I003 | 4 |
| [I009](docs/issues/I009-export-start-over.md) | Export (HTML/JSON) + start over | B | I008 | 2 |
| [I010](docs/issues/I010-ai-provider-abstraction.md) | Provider-agnostic AI abstraction + adapters | C | Phase 0 | 3 |
| [I011](docs/issues/I011-analyze-api.md) | `POST /api/v1/assessments/analyze` + strict schema | C | I002, I010, I012 | 4 |
| [I012](docs/issues/I012-safety-service.md) | Safety service + help-resource selection | C | Phase 0 | 3 |
| [I013](docs/issues/I013-observability-rate-limit.md) | Privacy-safe observability + rate limiting | D | I002 | 2 |
| [I014](docs/issues/I014-security-hardening.md) | Security hardening (CSP, escaping, limits) | D | I002, I008 | 3 |
| [I015](docs/issues/I015-e2e-tests.md) | E2E test journeys (Playwright) | E | I008, I009, I011 | 4 |
| [I016](docs/issues/I016-accessibility-suite.md) | Accessibility test suite + audit | E | I008 | 3 |
| [I017](docs/issues/I017-ai-eval-fixtures.md) | AI evaluation fixtures + harness | E | I011 | 3 |
| [I018](docs/issues/I018-delivery-docs.md) | Privacy policy draft, threat model, deployment docs | F | — | 2 |

Complexity is 1–5 (per the project's complexity-rating convention). No item is rated 5;
if one grows during implementation, decompose it before starting.

## Definition of Done (PRD §27)

A production build deploys with AI disabled or enabled; an anonymous adult completes the
full flow; deterministic results are domain-correct and reproducible; AI analysis is
evidence-grounded and schema-valid; privacy defaults are enforced; accessibility criteria
pass; and the test suite covers the critical scoring and failure paths.
