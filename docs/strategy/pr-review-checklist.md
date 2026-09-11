# Pre-PR Review Checklist

Use this checklist before pushing commits or opening a pull request for this automation repo.

## Scope

- Confirm the branch name starts with `feature/`.
- Confirm the diff only contains intended files.
- Confirm no screenshots, videos, traces, reports, `.env`, credentials, tokens, or generated noise are staged.
- Confirm README/docs/scripts are updated when behavior changes.

## Architecture

- Tests read like business flows and delegate mechanics to Page Objects, API clients, builders, fixtures, or assertions.
- Page Objects contain UI interactions and UI assertions for a page or component.
- API clients contain endpoint details and auth headers, not test assertions.
- Builders create clear, reusable test data.
- Fixtures inject shared clients, builders, sessions, and pages.
- Avoid duplicated selectors, raw URLs, credentials, or catalog IDs in tests.

## Safety

- Production tests are read-only.
- Destructive tests require `ALLOW_DESTRUCTIVE_TESTS=true`.
- Destructive tests include deterministic cleanup.
- UI destructive tests should normally run once in Chromium unless cross-browser mutation is explicitly needed.
- Staging/local data created by tests must be clearly identifiable, preferably with an `E2E-` prefix.

## Playwright Quality

- Prefer accessible locators: `getByRole`, `getByLabel`, `getByPlaceholder`, visible text.
- Avoid brittle CSS/XPath unless there is no accessible alternative.
- Avoid `waitForTimeout` and `networkidle`.
- Wait on meaningful UI state or specific API responses.
- Keep traces/videos/screenshots configured for debugging value, not noise.
- Generated Playwright agent code is treated as draft code until refactored into project patterns.

## Validation

Run the smallest reliable set for the change, and broaden when touching shared layers.

Recommended baseline:

```bash
npx tsc --noEmit
npm run test:contract
npm run test:ui:parallel
```

When API destructive behavior changes:

```bash
npm run test:staging:destructive
```

When UI destructive behavior changes:

```bash
npm run test:staging:destructive:ui
```

When Playwright agents or seed behavior changes:

```bash
npm run test:agent-seed
```

## Review Output

A review should report:

- Blockers: must fix before PR.
- Warnings: acceptable only with explicit rationale.
- Validation run: commands and results.
- Residual risk: what was not tested and why.
