# I010 — Provider-agnostic AI abstraction + adapters

- **Status:** ⬜ not started
- **Phase:** C (AI layer)
- **Depends on:** Phase 0
- **Complexity:** 3

## Context

The AI layer must be provider-agnostic and easily swappable (user requirement). The intended
provider is the **Z.AI GLM Coding Plan**, which exposes an **Anthropic Messages-compatible**
endpoint (`https://api.z.ai/api/anthropic`); an OpenAI-compatible endpoint also exists
(`https://api.z.ai/api/coding/paas/v4`). The core app must not depend on one model name
(PRD §15.1, §15.2). Keys live only on the server (PRD §11).

## Scope

**In:**
- `AnalysisProvider` interface in `src/server/ai-provider.ts`:
  `analyze(input: AnalysisProviderInput): Promise<AnalysisProviderResult>`.
- Two adapters selected via `AI_PROVIDER`: an Anthropic-Messages adapter (works for
  Anthropic and Z.AI GLM via configurable `ANTHROPIC_BASE_URL`) and an OpenAI-compatible
  adapter (configurable `OPENAI_BASE_URL`). Request schema-constrained / structured output.
- Configurable model + base URL + timeout via env; `AI_PROVIDER=none` disables AI so the
  app still runs (PRD §23, §15.8).
- No secrets in client artifacts, prompts, or logs.

**Out:** the analyze endpoint and prompt assembly (I011), safety (I012).

## Acceptance criteria

- [ ] Swapping providers requires only env changes, no core code changes.
- [ ] Anthropic-Messages adapter works against both Anthropic and Z.AI base URLs.
- [ ] With `AI_PROVIDER=none`, deterministic flow is unaffected.
- [ ] Provider key never present in client bundles, source maps, prompts, or logs.
- [ ] Timeout configurable; at most one retry for transient errors; no retry on refusals.

## References

PRD §15.1, §15.2, §15.8, §23, §11; Z.AI Anthropic-compatible endpoint (README "AI provider
direction").
