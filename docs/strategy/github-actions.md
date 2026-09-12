# GitHub Actions

This repo uses GitHub Actions for safe PR validation and manual staging destructive suites.

## Required Secrets

Configure these repository secrets:

```text
E2E_STAGING_USER_EMAIL
E2E_STAGING_USER_PASSWORD
```

The staging URLs are non-secret and live in the workflow env:

```text
E2E_BASE_URL=https://personal-finance-frontend-staging.vercel.app
E2E_API_URL=https://api-test.178-156-224-127.sslip.io/api
```

## PR Checks

Workflow:

```text
.github/workflows/pr-checks.yml
```

Runs on pull requests to `main` and pushes to `main`:

```bash
npx tsc --noEmit
npm run test:contract
npm run test:ui:parallel
```

This workflow is read-only from a product-data perspective because destructive tests are skipped unless `ALLOW_DESTRUCTIVE_TESTS=true`.

The workflow sets `E2E_WORKERS=2` for CI stability. Local runs can still use `npm run test:ui:parallel`, which defaults to 4 workers.

## Manual Staging Destructive Tests

Workflow:

```text
.github/workflows/staging-destructive.yml
```

Runs only via `workflow_dispatch`.

Available suites:

- `all`
- `api`
- `ui`

The workflow sets:

```text
TEST_ENV=staging
ALLOW_DESTRUCTIVE_TESTS=true
E2E_WORKERS=1
```

UI destructive tests run serially to avoid data races and reduce staging load.

## Artifacts

Both workflows upload:

- `playwright-report/`
- `test-results/`

Artifacts are retained for 7 days.
