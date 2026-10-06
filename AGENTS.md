# AGENTS.md

This repository uses Codex as the primary AI coding agent.

## Project

fuji-calendar is a TypeScript monorepo for planning Diamond Fuji and Pearl Fuji photography.

Main areas:

- `apps/client/`: React/Vite frontend
- `apps/server/`: Express/TypeScript backend and worker
- `packages/`: shared types, utilities, UI, and business logic
- `prisma/`: PostgreSQL schema and migrations
- `scripts/`: admin, debug, data-generation, architecture, and operational helpers
- `docs/`: architecture, calculations, API, setup, deployment, and troubleshooting documentation

## Before changing code

1. Read `README.md` and the relevant document under `docs/`.
2. Inspect the affected workspace, its callers, and existing tests before editing.
3. Check existing GitHub Issues and Pull Requests to avoid duplicate work.
4. Make the smallest change that satisfies the Issue and existing architecture.
5. Do not introduce a new framework, service, or abstraction without a demonstrated need.

## Architecture and project constraints

- Keep shared types and reusable cross-workspace logic in `packages/` rather than duplicating them.
- Use TypeScript strict-mode conventions and avoid unnecessary `any`.
- Use Prisma for database access; avoid raw SQL unless the task specifically requires it.
- Keep astronomical calculation behavior consistent with the documented Fuji calculation rules.
- Use the existing JST/time utilities for user-facing date/time behavior; do not introduce ad-hoc timezone conversion.
- Use the existing structured Pino logging path instead of adding `console.*` logging to application code.
- Keep expensive/background work on the existing Redis/BullMQ path when the current architecture already uses it.
- Preserve existing authentication and validation boundaries when changing admin APIs.

## Canonical commands

From the repository root:

```sh
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
npm run validate-architecture
npm run check-circular
```

Use narrower workspace commands when they are sufficient. Do not claim a command passed unless it was actually run.

## Code and comment guidance

Use each artifact to communicate a different kind of intent:

- Code should explain **How** the behavior is implemented.
- Test code should explain **What** behavior is expected.
- Commit messages should explain **Why** the change was made.
- Code comments should explain **Why not**: document non-obvious constraints, rejected alternatives, trade-offs, or reasons the seemingly simpler approach is incorrect.

Do not use comments to restate what the code already makes clear.

## Branch And Pull Request Workflow

- Do not edit, commit, or push directly to `main`. Make changes on a feature branch and merge them through a pull request.
- Direct work on `main` is allowed only when the user explicitly authorizes it.

## GitHub workflow

- GitHub Issues are the canonical work tracker.
- Shared Bug / Feature / Question forms and the default Pull Request template are inherited from `yuru-sha/.github`.
- Shared non-default labels, including `orca:*`, are synchronized from `yuru-sha/project-template`.
- Use `orca:*` labels only for ORCA execution state; do not treat them as release categories.

## Security and data

- Never commit real secrets, production credentials, tokens, private database dumps, or user data.
- Example development credentials in documentation are examples only; do not reuse them for production.
- Keep environment-specific secrets in environment variables and ignored local files.
- Do not weaken authentication, rate limiting, CSRF, validation, or logging controls as unrelated cleanup.

## Documentation layout

Keep these files at repository root:

- `README.md`
- `README.ja.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `AGENTS.md`

Keep other long-form documentation under `docs/`.

## Commit messages

Follow the commit-message policy in `CONTRIBUTING.md`.
