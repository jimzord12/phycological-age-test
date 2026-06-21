# I010 — Provider-agnostic AI abstraction + adapters

- **Status:** ⬜ not started
- **Phase:** C (AI layer)
- **Depends on:** Phase 0
- **Complexity:** 3

## Context

The AI layer must be provider-agnostic and easily swappable (user requirement). The intended
provider is the **Z.AI GLM Coding Plan**, which exposes both an **Anthropic Messages-compatible**
endpoint (`https://api.z.ai/api/anthropic`) and an **OpenAI-compatible** endpoint
(`https://api.z.ai/api/coding/paas/v4`). The core app must not depend on one model name
(PRD §15.1, §15.2). Keys live only on the server (PRD §11).

**Library decision (DD-5):** Use the **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic` +
`@ai-sdk/openai`) as the provider-agnostic layer instead of hand-rolled adapters. Both Z.AI
GLM endpoints are reachable via the SDK's configurable `baseURL`. See DD-5 for rationale.

## Scope

**In:**

- Add dependencies: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`.
- `src/server/ai-provider.ts` — thin wrapper around `generateObject()` that accepts
  `AnalysisProviderInput` and returns `Promise<AnalysisProviderResult>`. Provider and model
  are selected from env; the wrapper is the only place in the codebase that imports from
  `ai` or `@ai-sdk/*`.
- Two provider configurations selected via `AI_PROVIDER` env var:
  - `anthropic` — `createAnthropic({ baseURL: process.env.ANTHROPIC_BASE_URL })` (covers
    both native Anthropic and Z.AI GLM Anthropic-compat endpoint).
  - `openai` — `createOpenAI({ baseURL: process.env.OPENAI_BASE_URL })` (covers Z.AI GLM
    OpenAI-compat endpoint and standard OpenAI).
  - `none` — disables AI so the app runs without any provider (PRD §23, §15.8).
- Model name and timeout configurable via `AI_MODEL` and `AI_TIMEOUT_MS` env vars.
- Zod schema for the structured AI output passed to `generateObject()` — type-safe, no
  free-form JSON parsing.
- At most one retry for transient errors via the SDK's built-in retry; no retry on refusals.
- No secrets in client artifacts, prompts, or logs.

**Out:** the analyze endpoint and prompt assembly (I011), safety (I012).

## Env vars

| Variable | Required | Default | Notes |
|---|---|---|---|
| `AI_PROVIDER` | no | `none` | `anthropic` \| `openai` \| `none` |
| `AI_MODEL` | if provider ≠ none | — | e.g. `glm-4-plus`, `claude-3-5-haiku-20241022` |
| `ANTHROPIC_BASE_URL` | if `anthropic` | Anthropic default | Override for Z.AI: `https://api.z.ai/api/anthropic` |
| `OPENAI_BASE_URL` | if `openai` | OpenAI default | Override for Z.AI: `https://api.z.ai/api/coding/paas/v4` |
| `AI_API_KEY` | if provider ≠ none | — | Injected as the provider's API key |
| `AI_TIMEOUT_MS` | no | `30000` | Request timeout in ms |

## Acceptance criteria

- [ ] Swapping providers requires only env changes, no core code changes.
- [ ] `createAnthropic({ baseURL })` works against both native Anthropic and Z.AI GLM
      Anthropic-compat URLs.
- [ ] `createOpenAI({ baseURL })` works against Z.AI GLM OpenAI-compat URL.
- [ ] With `AI_PROVIDER=none`, `analyze()` returns a disabled result; deterministic flow
      is unaffected.
- [ ] AI output is validated through a Zod schema via `generateObject()` — no raw JSON
      parsing.
- [ ] Provider API key never present in client bundles, source maps, prompts, or logs.
- [ ] Timeout configurable; at most one retry for transient errors; no retry on refusals.
- [ ] Unit tests mock the SDK at the wrapper boundary; no live provider calls in CI.

## References

DD-5; PRD §15.1, §15.2, §15.8, §23, §11; Z.AI Anthropic-compatible endpoint (README "AI
provider direction"); Vercel AI SDK docs — `generateObject()`, provider configuration.
