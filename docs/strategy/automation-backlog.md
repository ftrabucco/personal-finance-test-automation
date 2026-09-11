# Automation Backlog and Progress

This backlog tracks coverage growth and framework maturity for the Personal Finance automation portfolio.

## Progress Snapshot

- [x] Playwright base framework.
- [x] API clients, builders, fixtures, Page Objects, safety guards.
- [x] API contract tests for auth and catalogs.
- [x] API destructive tests for unique expenses and unique incomes.
- [x] UI smoke tests for auth, dashboard, and core navigation.
- [x] UI destructive P0 flow for unique expense create/delete in staging.
- [x] Parallel UI execution with configurable workers.
- [x] Pre-PR review skill and checklist.
- [x] Playwright Agents setup with authenticated seed.

## P0 - Critical Coverage

- [ ] Add UI P0 flow for unique income create/delete.
- [ ] Add UI P0 flow for expense validation errors.
- [ ] Add UI P0 flow for income validation errors.
- [ ] Add API cleanup helpers by description or E2E prefix.
- [ ] Add reusable catalog selector helper for forms.
- [ ] Add GitHub Actions for contract and smoke tests.
- [ ] Add manual GitHub Actions workflow for staging destructive tests.

## P1 - Framework Maturity

- [ ] Add test tagging strategy documentation.
- [ ] Add flaky test policy and quarantine process.
- [ ] Add test data factory layer for UI flows.
- [ ] Add per-suite validation matrix in docs.
- [ ] Add richer assertions helpers for UI and API responses.
- [ ] Add CI HTML report artifact upload.
- [ ] Add trace/video retention policy for CI.
- [ ] Add environment smoke check before running destructive tests.

## P1 - Product Coverage

- [ ] Dashboard: validate totals after API-created expense/income.
- [ ] Gastos: filters by category, currency, and date.
- [ ] Gastos: edit unique expense.
- [ ] Ingresos: filters by source, currency, and date.
- [ ] Ingresos: edit unique income.
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
