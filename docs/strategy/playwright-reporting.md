# Playwright Reporting and Artifacts

## Defaults

The framework keeps artifacts mainly for failures so regular runs stay light,
but failed runs are still debuggable.

Default configuration:

```text
trace=retain-on-failure
screenshot=only-on-failure
video=retain-on-failure
```

These defaults are controlled in `playwright.config.ts`.

## Review Mode

For exploratory review or teaching/debug sessions, artifacts can be made more
verbose with environment variables:

```bash
E2E_TRACE=on E2E_SCREENSHOT=on E2E_VIDEO=on npx playwright test tests/ui --project=chromium
```

Use this intentionally because videos/traces for every passing test can grow
quickly.

## CI Artifacts

GitHub Actions uploads:

- `playwright-report/`
- `test-results/`

This applies to:

- PR checks.
- Manual staging destructive runs.

Reports are retained for seven days by default.

## Local Report

After a run:

```bash
npx playwright show-report
```

This opens the latest HTML report.
