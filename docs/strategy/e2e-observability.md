# E2E Observability Metadata

## Goal

Make every automated test run traceable across Playwright reports, API requests,
browser requests, backend logs, and future AI-assisted failure analysis.

## Metadata Model

Each test gets an `e2eContext` fixture with:

- `testRunId`: shared id for the whole Playwright process.
- `correlationId`: unique id for one test execution.
- `flowId`: functional flow id extracted from the test title, for example
  `CF-EXP-001`.
- `dataPrefix`: prefix for data created by that test.

Example:

```text
testRunId=e2e-20260912T183000Z-a1b2c3d4
correlationId=e2e-20260912T183000Z-a1b2c3d4-CF-EXP-001-chromium-r0-f9e8d7c6
flowId=CF-EXP-001
dataPrefix=E2E-CF-EXP-001-f9e8d7c6
```

## Headers

API clients and UI browser contexts send these headers automatically:

```text
x-e2e-test-run-id
x-e2e-correlation-id
x-e2e-flow-id
```

Backend logs should eventually include these headers in structured JSON logs so
failed test reports can be correlated with server-side events.

## Test Data

Tests that create data should use:

```ts
e2eContext.entityName('Gasto-Unico-UI')
```

This creates names like:

```text
E2E-CF-EXP-001-a1b2c3d4-Gasto-Unico-UI-1799777900000
```

That makes staging data easy to identify and clean up.

## Review Standard

Any new test, fixture, Page Object helper, API client, builder, or generated
Playwright agent output should preserve this model:

- use shared fixtures instead of manually creating clients when possible;
- do not hardcode ad hoc correlation ids;
- do not create staging data without an `E2E-` prefix;
- keep functional flow ids in test titles when the test maps to a critical flow.
