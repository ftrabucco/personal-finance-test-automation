# Codex Project Memory

## Git Strategy

- Work on feature branches for new changes.
- Use `feature/` as the default branch prefix for feature branches.
- Keep `main` protected conceptually: merge only after Fran reviews and approves.
- Prefer pull requests for review before merging to `main`.
- Avoid committing directly to `main` for new framework/test work.
- Existing work that started on `main` should be moved to a feature branch before review.

## Test Automation Policy

- Production is read-only for automation.
- Destructive tests run only against local or staging/test environments.
- Destructive tests require `ALLOW_DESTRUCTIVE_TESTS=true`.
- Prefer environment-specific credentials: `E2E_STAGING_USER_*` and `E2E_PROD_USER_*`.
- Staging API endpoint: `https://api-test.178-156-224-127.sslip.io/api`.
- Production frontend endpoint: `https://personal-finance-frontend-pied.vercel.app`.

## Pre-PR Review

- Before pushing or opening a PR, run the local `test-automation-pr-review` skill when review scope includes framework, test, fixture, POM, API client, builder, config, or CI changes.
- Use `docs/strategy/pr-review-checklist.md` as the visible review standard.
- Generated Playwright agent output must be reviewed and adapted to the framework before commit.
