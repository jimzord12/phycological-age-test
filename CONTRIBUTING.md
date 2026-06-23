# Contributing

## Prerequisites

- Node.js 22 or newer
- pnpm 10.33.0 (run `corepack enable` if pnpm is unavailable)

## Local setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

The application is available at `http://localhost:3000` by default. Do not commit local
environment files or secrets.

## Quality checks

Run the same validation used by CI before opening a pull request:

```sh
pnpm check
```

The command checks lint rules, performs TypeScript validation, runs tests with domain coverage
thresholds, and creates a production build. Formatting is currently an explicit contributor step
while the existing codebase is migrated to the shared Prettier configuration. Individual commands
are also available:

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

## Pull requests

- Keep changes focused and explain the resulting behavior.
- Add or update tests for behavior changes, especially deterministic scoring and safety logic.
- Preserve the privacy-first design: avoid sending assessment data to external services unless
  the user explicitly opts in.
- Update relevant documentation when setup, architecture, or behavior changes.
- Use clear commit messages and include verification results in the pull request.
