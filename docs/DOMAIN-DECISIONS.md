# Domain Decisions & Clarifications

This document records resolutions for points where the source documents
(`Psychological-Maturity-Questionnaire.DOMAIN.md`, `Psychological-Maturity-App.PRD.md`)
are silent or ambiguous. Per DOMAIN §17, these are **clarifications**, not changes to
question wording, answer order, score maps, rubric rules, or the AI prompt — so they do
**not** require a `questionnaire_version` / `scoring_version` / `prompt_version` increment.

Each decision names the governing source section, the resolution as implemented, and the
rationale. If a decision is later overturned, update the linked code and note it here.

---

## DD-1 — Structured Maturity Index when a dimension is `insufficient_data`

**Source:** DOMAIN §9.3 defines the Structured Maturity Index (SMI) only "When all five
dimensions are reportable." It does not define the value when one or more dimensions are
`insufficient_data`. PRD §14.2's example shows a numeric `structuredMaturityIndex`.

**Decision:** `structuredMaturityIndex` is `number | null`. It is `null` whenever any of
the five dimensions is `insufficient_data`; otherwise it is the equal-weighted, rounded
mean of the five normalized dimension scores. The index is never computed from a partial
set of reportable dimensions.

**Rationale:** Faithful to the literal "all five reportable" condition, and consistent
with the domain principle "confidence over false precision" (DOMAIN §4.5) — a single
aggregate computed from partial data would misrepresent its own certainty. Individual
reportable dimensions are still shown; the UI surfaces an "index unavailable — answer more
items in <dimension>" state (handled in the results-screen issue), not a fabricated number.

**Implemented in:** `src/domain/scoring.ts` (`scoreStructuredAssessment`),
`src/domain/result-types.ts` (`StructuredAssessmentResult.structuredMaturityIndex`).

---

## DD-2 — Narrative confidence when exactly one exercise meets its threshold

**Source:** DOMAIN §10.4 governs _scoreability_: both exercises meeting threshold →
scored; "either exercise fails its minimum-content threshold" → `limited_evidence`; both
skipped or below threshold → `not_scored` (never zero). DOMAIN §11.5 governs the separate
_narrative confidence_ label: `High` (both meet), `Moderate` (one meets and the other
contains meaningful content), `Low` (only one short exercise contains useful content),
`Not available` (no scorable content). §11.5 does **not** define the case "one meets the
threshold and the other is empty/skipped."

**Decision:**

- **Score status** is determined solely by how many exercises meet their threshold
  (`meets`): `meets == 2` → `scored`; `meets == 1` → `limited_evidence`; `meets == 0` →
  `not_scored`. This is purely DOMAIN §10.4.
- **Narrative confidence** (DOMAIN §11.5) is reported as:
  - `high` when both exercises meet their threshold;
  - `moderate` when exactly one exercise meets its threshold — **regardless** of whether
    the other is meaningful or empty (a full exercise is present either way);
  - `low` when no exercise meets its threshold but at least one has meaningful content
    (this corresponds to a `not_scored` result and is exposed via the standalone
    `narrativeConfidence()` helper for display; it is never attached to a computed score);
  - `not_available` when there is no scorable narrative content.

**Rationale:** §10.4 and §11.5 are orthogonal axes (scoreability vs. confidence). Treating
"one meets, other empty" as `moderate` is the closest defensible mapping because the result
still rests on one full, threshold-meeting exercise. The §11.5 `low` band describes content
that never produces a score, so it lives on the standalone confidence helper rather than on
a `NarrativeScoreResult`.

**Implemented in:** `src/domain/narrative-rubric.ts` (`narrativeConfidence`,
`calculateNarrativeScore`).

---

## DD-3 — Profile balance when fewer than two dimensions are reportable

**Source:** DOMAIN §9.4 defines `profile_spread = max - min` over reportable dimension
scores but does not address the degenerate cases of zero or one reportable dimension.

**Decision:** `profileBalance` is `ProfileBalance | null`. It is `null` when no dimension is
reportable. With exactly one reportable dimension, `spread = 0` →
`relatively_balanced` (max equals min). With two or more, the standard formula applies.

**Rationale:** Spread is undefined without at least one score; `null` is honest. A single
score trivially has zero spread, which the existing bands already classify correctly.

**Implemented in:** `src/domain/scoring.ts` (`calculateProfileBalance`),
`src/domain/result-types.ts` (`StructuredAssessmentResult.profileBalance`).

---

## DD-4 — Confidence "loose consistency" deduction only on the 1↔5 extreme

**Source:** DOMAIN §11.3: normalize each item score to 0–100; "If a pair differs by more
than 75 points, subtract 5." Item scores are integers 1–5, normalized as
`((score - 1) / 4) * 100` → {0, 25, 50, 75, 100}.

**Decision (note, not a change):** The only pair difference that exceeds 75 points is the
0↔100 extreme, i.e. raw scores of 1 and 5 (difference 100). A 2↔5 pair is exactly 75 and
does **not** trigger the deduction (strict "more than"). The deduction applies only when
**both** items in the pair are answered with a score (NA / unanswered items are skipped).

**Rationale:** Direct reading of the threshold; documented to prevent a future "off-by-one"
regression toward `>= 75`.

**Implemented in:** `src/domain/confidence.ts` (`CONSISTENCY_PAIRS`, deduction loop).

---

## DD-5 — Vercel AI SDK as the provider-agnostic AI layer

**Source:** PRD §15.1 ("provider-agnostic"), §15.2 ("swapping providers requires only env
changes"), §15.8 ("AI_PROVIDER=none must leave deterministic flow unaffected"), §11 ("keys
server-only"). I010 originally called for a hand-rolled `AnalysisProvider` interface with
two custom adapters.

**Decision:** Use the **Vercel AI SDK** (`ai` package) with `@ai-sdk/anthropic` and
`@ai-sdk/openai` provider packages instead of hand-rolled adapters.

- Provider swap is still purely env-driven (`AI_PROVIDER`, `AI_MODEL`, `*_BASE_URL`,
  `AI_API_KEY`) — no core code changes required.
- The Z.AI GLM Anthropic-compat endpoint (`https://api.z.ai/api/anthropic`) is covered by
  `createAnthropic({ baseURL: ... })`. The Z.AI OpenAI-compat endpoint is covered by
  `createOpenAI({ baseURL: ... })`.
- `generateObject()` with a Zod schema replaces hand-rolled JSON parsing and gives
  type-safe, schema-validated structured output — consistent with the project's use of Zod
  throughout.
- Retry and timeout handling come from the SDK, not custom code.
- `src/server/ai-provider.ts` remains a thin wrapper: the only file in the codebase that
  imports from `ai` or `@ai-sdk/*`. Domain layer stays pure (no AI SDK imports there).

**Rationale:** The SDK covers all PRD acceptance criteria and eliminates a substantial
amount of bespoke plumbing (adapter pattern, JSON validation, retry logic, streaming
primitives) that would need to be maintained. The functional overlap between the planned
custom adapters and what the SDK provides is near-total; building the adapters by hand would
be reinventing a well-maintained, widely-adopted library. First-class Next.js App Router
support is an additional fit.

**Implemented in:** `src/server/ai-provider.ts` (when I010 lands); env vars documented in
`docs/issues/I010-ai-provider-abstraction.md`.

---

## DD-6 — Dimension score band labels (DOMAIN §12.1)

**Source:** DOMAIN §12.1 prescribes "descriptive UI labels" for dimension score bands but
does not enumerate the specific band names or cut-points. PRD §8 requires neutral, non-clinical
language.

**Decision:** Five equal-ish bands on the 0–100 dimension score:

| Score range | Label       |
| ----------- | ----------- |
| 0–24        | Emerging    |
| 25–49       | Developing  |
| 50–74       | Established |
| 75–89       | Proficient  |
| 90–100      | Integrated  |

Labels are descriptive and neutral — they describe a continuum of behavioral expression, not
a judgment, rank, or clinical category.

**Rationale:** The cut-points align naturally with the 1–5 raw item scale normalized to 0–100:
a raw mean of 1.0 → 0, 2.0 → 25, 3.0 → 50, 4.0 → 75, 5.0 → 100. The top two bands (Proficient
90+, Integrated) are narrower because the normalized scale clusters at 75 and 100 at the high end.

**Implemented in:** `src/app/_results-screen.tsx` (`getBandLabel`).
