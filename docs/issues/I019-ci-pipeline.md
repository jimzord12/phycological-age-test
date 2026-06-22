# I019 — Minimal CI pipeline (GitHub Actions)

- **Status:** ✅ done
- **Phase:** D (cross-cutting)
- **Depends on:** none
- **Complexity:** 1

## Context

There is currently no automated validation on push or pull request. Every agent session
manually runs `pnpm typecheck`, `pnpm test`, and `pnpm build` before committing, but
nothing enforces this on the remote. A minimal CI workflow closes that gap and gives PRs
a green/red signal without any new runtime infrastructure.

## Scope

**In:**

- `.github/workflows/ci.yml` — single workflow triggered on `push` (all branches) and
  `pull_request`.
- Jobs (run in sequence on a single `ubuntu-latest` runner):
  1. **Install** — `pnpm install --frozen-lockfile` with pnpm store cache keyed on
     `pnpm-lock.yaml`.
  2. **Typecheck** — `pnpm typecheck`.
  3. **Test** — `pnpm test`.
  4. **Build** — `pnpm build`.
- Node version pinned to `22` (matches `engines` field in `package.json`).
- pnpm version sourced from `packageManager` field in `package.json` via
  `pnpm/action-setup`.

**Out:** deployment, preview environments, secrets management, coverage reporting,
Playwright E2E (those come later under I015/I018).

## Acceptance criteria

- [x] Workflow file present at `.github/workflows/ci.yml`.
- [x] All four steps (install → typecheck → test → build) run and must pass for the
      workflow to succeed.
- [x] pnpm store is cached between runs (keyed on `pnpm-lock.yaml` hash).
- [x] Workflow runs on push to any branch and on pull requests.
- [x] No secrets, credentials, or environment-specific config required to pass CI
      (the deterministic path runs with AI disabled by default).

## Implementation notes

- Use `actions/setup-node@v4` with `node-version: '22'` and `cache: 'pnpm'` (requires
  `pnpm/action-setup` to run first so the cache key is available).
- `pnpm build` runs `next build`, which regenerates `tsconfig.json` — this is expected
  (see KNOWLEDGE.md). The build step should succeed without committing the regenerated
  file; the workflow runs on a fresh checkout each time.
- No `.env.local` is needed: AI is disabled by default and deterministic scoring
  requires no secrets.

## References

AGENTS.md §5 (branch naming), §7 (quick start commands); KNOWLEDGE.md (`next build`
rewrites `tsconfig.json`).
