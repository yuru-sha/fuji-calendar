# Contributing

## Before contributing

- Search existing Issues and Pull Requests before starting duplicate work.
- Read `AGENTS.md` and the relevant documentation under `docs/`.
- Keep changes focused on one Issue or clearly related outcome.
- Avoid unrelated cleanup and unnecessary dependencies.

## Development

Install dependencies and use the repository scripts as the source of truth:

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Run additional focused checks relevant to the changed workspace or architecture.

## Pull requests

Open changes from a feature branch rather than working directly on `main`.

A Pull Request should:

- explain what changed and why;
- link the related Issue when one exists;
- list the checks that were actually run;
- call out breaking changes, migrations, risks, or follow-up work.

Shared Pull Request and Issue templates are inherited from `yuru-sha/.github`.

## Commit messages

Use Conventional Commits 1.0.0.

Examples:

```text
feat(calendar): add event filter
fix(server): preserve JST event date
docs: update setup guide
test(calculator): cover horizon boundary
```

Use `BREAKING CHANGE:` or `!` when a commit intentionally introduces a breaking change.
