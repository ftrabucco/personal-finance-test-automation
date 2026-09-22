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
  - [x] Add `update` methods for `GastosRecurrentesApiClient`/`DebitosAutomaticosApiClient` (needed to reach the monthly-generation coverage below). No dedicated edit-flow test yet.
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
  - [x] UI coverage for category and date filters.
  - [ ] Currency filter pending backend fix for `BUG-2026-005`.
- [x] Gastos: edit unique expense.
- [x] Gastos: API/UI representative definition flow for recurring expenses (`CF-SCH-001`).
- [x] Gastos: API/UI representative definition flow for automatic debits (`CF-SCH-002`).
- [x] Gastos: API/UI representative definition flow for purchases in installments (`CF-SCH-003`).
- [ ] Ingresos: filters by source, currency, and date.
  - [x] API coverage for source and date filters.
  - [x] UI coverage for source and date filters.
  - [ ] Currency filter pending backend support.
- [x] Ingresos: edit unique income.
- [x] Configuracion: read-only module state smoke.
- [x] Perfil: read-only account data smoke.
  - [x] Password form initial state smoke.
  - [x] Restored-session account data prefill covered by `CF-PROFILE-READ-002`.

## P2 - Advanced Portfolio Value

- [ ] Add visual documentation of architecture.
- [ ] Add ADR for read-only vs destructive policy.
- [ ] Add examples of generated-vs-refactored Playwright Agent output.
- [ ] Add API schema/type validation for critical responses.
- [ ] Add test coverage dashboard or markdown status table.
- [ ] Add nightly schedule for cross-browser UI smoke.
- [ ] Add release checklist for automation changes.

## P2 - Scheduled Generation Behavior

- [x] Define controlled-clock strategy for scheduled flows.
  - No reference-date override exists on the backend (`GET /gastos/generate` always runs against the real clock), so tests control the *data* (backdated `fecha_compra`/`fecha_inicio`, `dia_de_pago` set to today) instead of the clock. Date math lives in `src/utils/scheduledGeneration.ts`, mirroring the backend's own day-clamping rule and computing "today" in Buenos Aires time (not the test runner's local/UTC time) to avoid the same class of timezone bug fixed in `personal-finance-api-nodeJS` PR #38.
- [x] Validate recurrent expense generation/non-generation by reference date (`CF-SCH-GEN-002`).
  - Covers: generates on payment day, respects `fecha_inicio`, skips inactive definitions, prevents same-day duplicates.
  - Found a real backend bug along the way: `POST /gastos-recurrentes` and `POST /debitos-automaticos` hardcode `activo: true` in the controller, ignoring the request body's `activo` field — you cannot create either as inactive. Worked around in the test by creating then deactivating via `PUT` (which does respect it). Not fixed here — flag to Fran.
- [x] Validate automatic debit generation/non-generation by reference date (`CF-SCH-GEN-003`).
  - Same coverage as recurring expenses, minus the `fecha_inicio` case (not settable via the create payload for débitos automáticos).
- [x] Validate installment purchase monthly generation and duplicate prevention (`CF-SCH-GEN-001`, parametrized for 4 and 6 cuotas to exercise the catch-up loop beyond a single hardcoded size).
- [x] Validate scheduled generated expenses in history and dashboard.
  - History: a scheduled-generated gasto is retrievable via `tipo_origen`+`id_origen` filters and via date-range filters on `GET /gastos` (`CF-SCH-GEN-004`).
  - Dashboard: a gasto recurrente generated via `/gastos/generate` (not a direct create) is reflected in the "Gastos del Mes" UI total, same assertion pattern as `CF-DASH-001` (`CF-SCH-GEN-005`, `tests/ui/scheduled-generation.destructive.spec.ts`). Verified locally with both the API and the frontend dev server running.
- [x] Validate installment purchases paid with a credit card (due-date cycle) and concurrent-generation duplicate prevention.
  - New `TarjetasApiClient`/`TarjetaBuilder` (`src/api/tarjetas.api.ts`, `src/builders/TarjetaBuilder.ts`) and `creditCardDueDate()` in `scheduledGeneration.ts`, mirroring the backend's `CreditCardDateService` closing/due-cycle math.
  - `CF-SCH-GEN-006`: catch-up of missed credit-card cuotas, purchase made before the card's closing day.
  - `CF-SCH-GEN-008`: purchase made *after* the closing day is due a full cycle later.
  - `CF-SCH-GEN-007`: two concurrent `/gastos/generate` calls against the same compra must not create two gastos for the same cuota. This caught a real, confirmed race condition — fixed in `personal-finance-api-nodeJS` PR #39 (the local dev DB already had real duplicate rows from it, e.g. 8 copies of the same gasto recurrente on one date). The test failed intermittently against `master`/pre-fix and now passes reliably (10/10 local runs) against the fix.
  - Fixed a latent bug in the test builders while writing these: `build()` returned the builder's internal data object by reference, so building several payloads from the same builder instance (without sending each immediately) let later `.withX()` calls mutate earlier "built" payloads still waiting to be used. All builders now return a shallow copy.
- [x] Validate débito automático catch-up when its payment day already passed before it was ever generated (`CF-SCH-GEN-009`).
  - Found and confirmed a real gap: unlike `GastoRecurrenteService`, `DebitoAutomaticoService` had no "never generated, day already passed" catch-up branch — only a small 1-5 day weekend/holiday tolerance. A débito created with `dia_de_pago` earlier in the current month silently never generated until the following month. Fixed in `personal-finance-api-nodeJS` PR #41, which also fixed `AutomaticDebitExpenseStrategy.generate()` ignoring any catch-up target date and always stamping "today", plus a fresh instance of the `moment({...}).tz(zone)` vs `moment.tz({...}, zone)` timezone bug (PR #38's class of bug) introduced while writing the fix itself, caught by running under `TZ=UTC`.
  - Test fails against `master`/pre-fix (0 gastos generated) and passes against the fix.

## P2 - AI Quality Orchestration

- [x] Add `TEST_RUN_ID` generation per Playwright execution.
  - Fixed: it was regenerated per worker process instead of shared. `globalSetup.ts` now sets it once before workers spawn; `getTestRunId()` reads `process.env.TEST_RUN_ID` lazily instead of caching it at module import time.
- [x] Add per-test correlation metadata helper.
- [x] Send E2E metadata headers from API clients:
  - `x-e2e-test-run-id`
  - `x-e2e-correlation-id`
  - `x-e2e-flow-id`
- [x] Add E2E entity naming convention for created data, e.g. `E2E-CF-EXP-001-<timestamp>`.
- [x] Attach E2E metadata to Playwright test output on failure.
- [x] Capture Playwright failure artifacts into a triage-friendly folder.
  - `TriageReporter` (`src/reporting/TriageReporter.ts`) copies trace/video/screenshot/error-context.md per failing test into `triage/<testRunId>/`. See `docs/strategy/playwright-reporting.md`.
- [x] Generate a first failure diagnosis Markdown from Playwright output and `error-context.md`.
  - Per-failure Markdown with error, stack, artifacts, and a heuristic classification hint (`src/reporting/failureClassifier.ts`) that still requires manual confirmation.
- [x] Add staging backend log capture by time window or correlation id.
  - `.github/workflows/triage-orchestrator.yml` pulls a fixed time window of backend logs over a command-restricted SSH key. Verified against real staging logs: E2E metadata (`testRunId`/`correlationId`/`flowId`) does show up in `docker logs finanzas-api-test`. See `docs/strategy/failure-orchestrator.md`.
- [x] Correlate failed test artifacts with backend logs.
  - `scripts/triage-orchestrator.mjs` feeds the triage summary + backend logs + recent merged PRs (frontend and backend) to Claude to produce a root-cause hypothesis per run, written to `orchestrator-summary.md`. Wiring verified end-to-end with real data (real triage failure + real merged PRs) in dry-run mode. Still a first-pass hint requiring manual confirmation, not an automated verdict.
  - `ANTHROPIC_API_KEY` deliberately not configured yet (Claude Pro subscription doesn't include API access; needs a separate console.anthropic.com account with its own billing, or a different provider). Orchestrator degrades to dry-run without it, so this doesn't block anything — see `docs/strategy/failure-orchestrator.md#estado-actual-2026-09-18`.
- [ ] Classify failures as app bug, test bug, data issue, environment issue, or infrastructure issue.
  - Heuristic first pass already suggests a category per failure (`failureClassifier.ts`), and the orchestrator now proposes a second, evidence-backed category with confidence. Still needs a confirmed/final classification workflow.
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
