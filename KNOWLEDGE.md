# KNOWLEDGE.md

Terse catalogue of project **quirks and edge cases** — surprises discovered only by working
on the code, which would otherwise cost the next agent a debug/feedback loop. These are
**not** architecture decisions (those live in `docs/DOMAIN-DECISIONS.md`). Keep records
short and to the point.

## Routine when adding a record

1. Write the record (format below). Keep it terse.
2. **If practical, add a detector test** (e.g. in `src/quirks.test.ts`) that fails when the
   quirk no longer holds — a cheap way to learn when an upstream fix lands so the entry can
   be **retired**. Reference the test in the record's `Detector` line. If a quirk can't be
   cheaply tested, write `Detector: none — verify manually` and say why.
3. **Then, and only then**, run `pnpm knowledge:size`. If it reports over 150 KB, add a note
   at the top of `docs/Handoff.md` so the next agent distills this file first (AGENTS.md §6).

When a detector test fails because the quirk is gone, delete the entry **and** its detector.

Record format:

```
### <short title>
- **Symptom:** ...
- **Cause:** ...
- **Fix:** ...
- **Detector:** `src/quirks.test.ts` → "<test title>"  |  none — verify manually (<why>)
```

---

### `next build` rewrites tsconfig.json
- **Symptom:** `jsx` set to `react-jsx` and `.next/dev/types/**/*.ts` added to `include`
  after running `pnpm build`, even if you committed `jsx: "preserve"`.
- **Cause:** Next 16 reconciles tsconfig on build (mandatory changes + suggestions).
- **Fix:** Let it. Don't revert these; they are expected. Commit the reconciled tsconfig.
- **Detector:** none — verify manually (requires running `next build`; too costly for a unit test).

### `noUncheckedIndexedAccess` makes indexing return `T | undefined`
- **Symptom:** `TS18048: '<x>' is possibly 'undefined'` on array index / tuple destructure
  (e.g. `const [a, b] = ARR` or `questions[i]`).
- **Cause:** Enabled in tsconfig (intentional, stricter safety).
- **Fix:** Guard, or assert with `!` when the index is known-valid (e.g. `ARR[0]!`). Common
  in tests that index the canonical bank.
- **Detector:** `src/quirks.test.ts` → "K: strict tsconfig flags stay enabled (...)".

### `verbatimModuleSyntax` requires type-only imports
- **Symptom:** Build/typecheck errors about importing a type as a value.
- **Cause:** Enabled in tsconfig.
- **Fix:** Use `import type { Foo }` for types, or inline `import { type Foo, bar }`.
- **Detector:** `src/quirks.test.ts` → "K: strict tsconfig flags stay enabled (...)".

### Score maps: option "C" is NOT always the best answer
- **Symptom:** Test fixtures that assume "C = max score" produce wrong expected values.
- **Cause:** The canonical bank is behaviorally anchored, not ordered. E.g. `ER03` C=3 (B=5),
  `TD04` A=2/D=1. Several items are midpoint-optimal by design (DOMAIN §4.3).
- **Fix:** Derive the max/min option from the score map (see `optionWithScore` in
  `scoring.test.ts`); never hardcode an option letter as "the mature one".
- **Detector:** `src/quirks.test.ts` → 'K: option "C" is not uniformly the highest-scoring option in the bank'.

### Vitest uses the `@/` alias separately from tsconfig
- **Symptom:** `@/...` imports resolve in `tsc` but fail (or vice-versa) in tests.
- **Cause:** Two resolvers: `tsconfig.json#paths` (for tsc/Next) and `vitest.config.ts`
  `resolve.alias` (for tests).
- **Fix:** Keep both in sync when changing the alias. Currently both map `@/* -> ./src/*`.
- **Detector:** `src/quirks.test.ts` → "K: the @/ path alias resolves under vitest".

### Vitest global environment is `node`; DOM tests require a per-file directive
- **Symptom:** A test file that touches DOM APIs (`document`, `window`, `sessionStorage`)
  fails with `document is not defined` unless it opts in to jsdom.
- **Cause:** `vitest.config.ts` sets `environment: "node"` globally (intentional — keeps
  domain tests fast). `jsdom` is installed (added I003) but not the default.
- **Fix:** Add `// @vitest-environment jsdom` as the first line of any test file that needs
  a DOM. See `src/client/storage.test.ts` for an established example. Domain tests stay on
  `node` — do not change the global config.
- **Detector:** `src/quirks.test.ts` → "K: vitest runs in a DOM-less (node) environment"
  (flips when a global DOM env is introduced — update this entry then).

### pnpm ignores the `sharp` build script
- **Symptom:** `Ignored build scripts: sharp@0.34.5` warning on `pnpm install`.
- **Cause:** pnpm blocks postinstall scripts by default; `sharp` ships native binaries.
- **Fix:** Harmless for the current scope. If `next/image` optimization is needed at build
  time later, run `pnpm approve-builds` and select `sharp`.
- **Detector:** none — verify manually (it's a one-time `pnpm install` warning).

### Zod v4 schemas must be wrapped with `zodSchema()` for AI SDK v6 `generateObject()`
- **Symptom:** TypeScript or runtime errors when passing a Zod v4 schema directly to
  `generateObject({ schema: myZodSchema })`.
- **Cause:** `generateObject` expects `FlexibleSchema<T>`; Zod v4 schemas satisfy the
  Standard Schema v1 interface (`~standard`) at runtime, but the AI SDK's TypeScript
  overloads may not align with Zod v4 types without the wrapper.
- **Fix:** Use `zodSchema(mySchema)` from `"ai"` before passing to `generateObject`.
  The wrapper converts to `{ _type, jsonSchema, validate }` — all AI SDK internals use
  it correctly. Validate function is async (returns Promise) in this setup; that's expected.
- **Detector:** `src/server/ai-provider.test.ts` — any schema test failure would surface this.

### `next-env.d.ts` is generated and gitignored
- **Symptom:** Full-app `tsc` may complain about missing Next types on a clean checkout.
- **Cause:** Next generates `next-env.d.ts` on `dev`/`build`; it is gitignored.
- **Fix:** Run `pnpm build` (or `pnpm dev`) once to generate it. Domain unit tests/typecheck
  do not depend on it.
- **Detector:** none — verify manually (clean-checkout `tsc` behavior).
