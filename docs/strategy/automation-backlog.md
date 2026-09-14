# Automation Backlog and Progress

This backlog tracks coverage growth and framework maturity for the Personal Finance automation portfolio.

## Progress Snapshot

- [x] Playwright base framework.
- [x] API clients, builders, fixtures, Page Objects, safety guards.
- [x] API contract tests for auth and catalogs.
- [x] API destructive tests for unique expenses and unique incomes.
- [x] UI smoke tests for auth, dashboard, and core navigation.
- [x] UI destructive P0 flow for unique expense create/delete in staging.
- [x] UI destructive P0 flow for unique income create/delete in staging.
- [x] Parallel UI execution with configurable workers.
- [x] Pre-PR review skill and checklist.
- [x] Playwright Agents setup with authenticated seed.

## P0 - Critical Coverage

- [x] Add UI P0 flow for unique income create/delete.
- [x] Add UI P0 flow for expense validation errors.
- [x] Add UI P0 flow for income validation errors.
- [x] Add API cleanup helpers by description or E2E prefix.
- [x] Add reusable catalog selector helper for forms.
- [x] Add API P0 flow for unique expense consolidated history.
- [x] Add API P0 auth hardening for invalid tokens.
- [x] Add GitHub Actions for contract and smoke tests.
- [x] Add manual GitHub Actions workflow for staging destructive tests.

## P1 - Framework Maturity

- [x] Add test tagging strategy documentation.
- [x] Add flaky test policy and quarantine process.
- [x] Add E2E metadata model: test run id, correlation id, flow id, entity prefix, timestamps.
- [x] Add test data factory layer for UI flows.
- [x] Add dedicated builders for scheduled expense flows: purchases, recurring expenses, and automatic debits.
  - [x] Add `GastoRecurrenteBuilder` and API client.
  - [x] Add `CompraBuilder` and API client.
  - [x] Add `DebitoAutomaticoBuilder` and API client.
  - [ ] Add update/process methods when coverage reaches edit and monthly generation flows.
- [x] Add per-suite validation matrix in docs.
- [x] Add richer assertions helpers for UI and API responses.
- [x] Add CI HTML report artifact upload.
- [x] Add trace/video retention policy for CI.
- [x] Add environment smoke check before running destructive tests.
- [x] Add read-only schema drift check for critical STG/PROD table columns.

## P1 - Product Coverage

- [x] Dashboard: validate totals after API-created expense/income.
- [ ] Gastos: filters by category, currency, and date.
  - [x] API coverage for category and date filters.
  - [ ] Currency filter pending backend fix for `BUG-2026-005`.
- [x] Gastos: edit unique expense.
- [ ] Gastos: API/UI representative flow for recurring expenses (`CF-SCH-001`).
- [ ] Gastos: API/UI representative flow for automatic debits (`CF-SCH-002`).
- [ ] Gastos: API/UI representative flow for purchases in installments (`CF-SCH-003`).
- [ ] Ingresos: filters by source, currency, and date.
  - [x] API coverage for source and date filters.
  - [ ] Currency filter pending backend support.
- [x] Ingresos: edit unique income.
- [ ] Configuracion: read-only module state smoke.
- [ ] Perfil: read-only account data smoke.

## P2 - Advanced Portfolio Value

- [ ] Add visual documentation of architecture.
- [ ] Add ADR for read-only vs destructive policy.
- [ ] Add examples of generated-vs-refactored Playwright Agent output.
- [ ] Add API schema/type validation for critical responses.
- [ ] Add test coverage dashboard or markdown status table.
- [ ] Add nightly schedule for cross-browser UI smoke.
- [ ] Add release checklist for automation changes.

## P2 - AI Quality Orchestration

- [x] Add `TEST_RUN_ID` generation per Playwright execution.
- [x] Add per-test correlation metadata helper.
- [x] Send E2E metadata headers from API clients:
  - `x-e2e-test-run-id`
  - `x-e2e-correlation-id`
  - `x-e2e-flow-id`
- [x] Add E2E entity naming convention for created data, e.g. `E2E-CF-EXP-001-<timestamp>`.
- [x] Attach E2E metadata to Playwright test output on failure.
- [ ] Capture Playwright failure artifacts into a triage-friendly folder.
- [ ] Generate a first failure diagnosis Markdown from Playwright output and `error-context.md`.
- [ ] Add staging backend log capture by time window or correlation id.
- [ ] Correlate failed test artifacts with backend logs.
- [ ] Classify failures as app bug, test bug, data issue, environment issue, or infrastructure issue.
- [ ] Generate a ticket-ready regression summary.
- [ ] Optional later: create GitHub issue automatically after manual approval.

## E2E Metadata Convention

- **Test run id:** identifies one full execution, for example `e2e-2026-09-11-153000`.
- **Correlation id:** identifies one test case or operation inside the run, for example `CF-EXP-001-abc123`.
- **Flow id:** stores the business/test flow, for example `CF-EXP-001`.
- **Entity prefix:** goes into data created by tests, usually in user-visible fields like `descripcion`.
- **Timestamps:** should exist in Playwright output and backend logs using consistent ISO format where possible.

Recommended request headers for API clients and UI-triggered requests when supported:

```text
x-e2e-test-run-id: e2e-2026-09-11-153000
x-e2e-correlation-id: CF-EXP-001-abc123
x-e2e-flow-id: CF-EXP-001
```

Recommended entity naming:

```text
E2E-CF-EXP-001-20260911-153000-gasto-supermercado
```

These identifiers should make it possible for an AI triage process to connect:

- Playwright test failure.
- Test data created during the run.
- API request/response logs.
- Backend application logs.
- Staging environment health.

## How To Use Playwright Agents

Use agents as accelerators, not as final authors.

- **Planner:** use for exploring a feature and drafting test plans in `specs/`.
- **Generator:** use for first drafts of UI tests from approved plans.
- **Healer:** use when a test fails because selectors or timing changed, after confirming expected behavior is still valid.

Do not use generated tests directly in final code when they bypass:

- Page Objects.
- Fixtures.
- API clients.
- Builders.
- Safety guards.
- Cleanup policies.

## Good Agent Candidate Tasks

- [ ] Draft a test plan for unique income UI flows.
- [ ] Draft a test plan for dashboard finance cards.
- [ ] Draft a test plan for expense filters.
- [ ] Generate a first-pass UI test for income create/delete, then refactor into POM + Builder + API cleanup.
- [ ] Heal a failing selector after a confirmed UI change.

## Tasks To Avoid With Agents For Now

- Designing global framework architecture.
- Writing safety policy.
- Creating destructive tests without manual review.
- Editing credentials or environment files.
- Making production-mutating flows.

## Definition Of Done

For each backlog item:

- [ ] Test or doc exists in the expected location.
- [ ] Naming follows `CF-*`, tags, and priority conventions.
- [ ] Destructive behavior is guarded and has cleanup.
- [ ] Relevant commands pass locally or in CI.
- [ ] Pre-PR review has no blockers.
- [ ] README or docs are updated when usage changes.
