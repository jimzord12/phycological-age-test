# KNOWLEDGE.md

Terse catalogue of project **quirks and edge cases** — surprises discovered only by working
on the code, which would otherwise cost the next agent a debug/feedback loop. These are
**not** architecture decisions (those live in `docs/DOMAIN-DECISIONS.md`). Keep records
short and to the point.

**After adding a record here, and only then, run `pnpm knowledge:size`.** If it reports the
file is over 150 KB, add a note at the top of `docs/Handoff.md` so the next agent distills
this file first. (See AGENTS.md §6.)

Record format: `### <short title>` → **Symptom / Cause / Fix**.

---

### `next build` rewrites tsconfig.json
- **Symptom:** `jsx` set to `react-jsx` and `.next/dev/types/**/*.ts` added to `include`
  after running `pnpm build`, even if you committed `jsx: "preserve"`.
- **Cause:** Next 16 reconciles tsconfig on build (mandatory changes + suggestions).
- **Fix:** Let it. Don't revert these; they are expected. Commit the reconciled tsconfig.

### `noUncheckedIndexedAccess` makes indexing return `T | undefined`
- **Symptom:** `TS18048: '<x>' is possibly 'undefined'` on array index / tuple destructure
  (e.g. `const [a, b] = ARR` or `questions[i]`).
- **Cause:** Enabled in tsconfig (intentional, stricter safety).
- **Fix:** Guard, or assert with `!` when the index is known-valid (e.g. `ARR[0]!`). Common
  in tests that index the canonical bank.

### `verbatimModuleSyntax` requires type-only imports
- **Symptom:** Build/typecheck errors about importing a type as a value.
- **Cause:** Enabled in tsconfig.
- **Fix:** Use `import type { Foo }` for types, or inline `import { type Foo, bar }`.

### Score maps: option "C" is NOT always the best answer
- **Symptom:** Test fixtures that assume "C = max score" produce wrong expected values.
- **Cause:** The canonical bank is behaviorally anchored, not ordered. E.g. `ER03` C=3 (B=5),
  `TD04` A=2/D=1. Several items are midpoint-optimal by design (DOMAIN §4.3).
- **Fix:** Derive the max/min option from the score map (see `optionWithScore` in
  `scoring.test.ts`); never hardcode an option letter as "the mature one".

### Vitest uses the `@/` alias separately from tsconfig
- **Symptom:** `@/...` imports resolve in `tsc` but fail (or vice-versa) in tests.
- **Cause:** Two resolvers: `tsconfig.json#paths` (for tsc/Next) and `vitest.config.ts`
  `resolve.alias` (for tests).
- **Fix:** Keep both in sync when changing the alias. Currently both map `@/* -> ./src/*`.

### Vitest environment is `node` (no DOM yet)
- **Symptom:** Future React component tests fail with `document is not defined`.
- **Cause:** `vitest.config.ts` sets `environment: "node"`; jsdom is not installed.
- **Fix:** When adding component tests, install `jsdom` and set the environment per-file
  (`// @vitest-environment jsdom`) or split config. Domain tests stay on `node`.

### pnpm ignores the `sharp` build script
- **Symptom:** `Ignored build scripts: sharp@0.34.5` warning on `pnpm install`.
- **Cause:** pnpm blocks postinstall scripts by default; `sharp` ships native binaries.
- **Fix:** Harmless for the current scope. If `next/image` optimization is needed at build
  time later, run `pnpm approve-builds` and select `sharp`.

### `next-env.d.ts` is generated and gitignored
- **Symptom:** Full-app `tsc` may complain about missing Next types on a clean checkout.
- **Cause:** Next generates `next-env.d.ts` on `dev`/`build`; it is gitignored.
- **Fix:** Run `pnpm build` (or `pnpm dev`) once to generate it. Domain unit tests/typecheck
  do not depend on it.
