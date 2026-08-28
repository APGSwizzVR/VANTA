# Contributing to VANTA

VANTA is a free, community-run flight simulation network. Contributions
are welcome from anyone, whether you fly, control, or just write code.

## Before you start

- Check open issues and pull requests first so effort isn't duplicated.
- For anything larger than a small fix, open an issue describing the
  change before writing code, so the approach can be agreed on first.
- Read `README.md` for the current architecture and honestly-tracked
  status of each subsystem (implemented / scaffolded / not started).
  Please don't claim a feature works in a PR description unless you've
  actually exercised it end-to-end.

## Development conventions

- **TypeScript everywhere** in `apps/`, `services/`, and `packages/`.
  `strict` mode is on; don't add `any` casts or `@ts-ignore` to work
  around a type error without a comment explaining why it's necessary.
- **Never trust client input.** Any data arriving over HTTP or the
  WebSocket must be validated with a Zod schema before it touches
  business logic. Add new wire messages to `packages/protocol`, not
  ad hoc inline parsing in a service.
- **No placeholder features.** Don't ship a button, endpoint, or UI
  element that displays "coming soon" or returns fake data. If
  something isn't ready, leave it out of the UI/API entirely and note
  the gap in the README status table instead.
- **Secrets never hit the repo.** All configuration goes through env
  vars documented in the relevant `.env.example`. If you add a new
  env var, add it to `.env.example` with a comment explaining it.
- **Complete files, not fragments.** When you open a PR that changes a
  file, the file should be complete and working, not a snippet the
  reviewer has to merge by hand.

## Commit messages

Use a short, descriptive prefix: `feat:`, `fix:`, `chore:`, `docs:`,
`refactor:`. Explain *why* in the body when the change isn't obvious
from the diff alone.

## Running checks locally before opening a PR

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass — the same checks run in CI (`.github/workflows/ci.yml`)
and a PR won't be merged if they fail.

## Reporting security issues

Please do not open a public issue for a security vulnerability
(e.g. an authentication bypass, a way to spoof ATC authority, or a way
to make the server trust unvalidated telemetry). Instead, open a private
security advisory via GitHub's "Security" tab on this repository.

## License

By contributing, you agree your contribution is licensed under the
project's MIT License (see `LICENSE`).
