# Known Product Defects

This document tracks frontend, backend, API, environment, and data consistency
issues discovered while building automated tests.

Use this as the source of truth for expected behavior that is not currently met
by the application.

## Status Values

- `Open`: confirmed issue, not fixed yet.
- `Needs Analysis`: suspected issue, needs product/code confirmation.
- `Fixed`: fixed in the application and covered by a passing test.
- `Won't Fix`: accepted behavior, with rationale.

## Defects

## BUG-2026-001 - Creating a gasto recurrente ignores `activo: false`

- Status: Open
- Severity: Medium
- Area: Backend API
- Found by: `tests/api/gastos-recurrentes.destructive.spec.ts`
- Related flow: `CF-SCH-001`
- Evidence: `POST /gastos-recurrentes` with `activo: false` returns a created
  definition with `activo: true`.
- Expected: The API should preserve explicit `activo: false` when creating a
  recurrent expense definition.
- Actual: The create controller forces `activo: true`, overriding the request
  body.
- Proposed test: Add a contract/destructive API test that creates a recurrent
  definition with `activo: false` and expects the persisted resource to remain
  inactive after the backend is fixed.
- Tracking: Not created yet.

## BUG-2026-002 - Creating a compra fails because staging DB schema is missing a model column

- Status: Fixed
- Severity: High
- Area: Backend API / Staging DB
- Found by: `tests/api/compras.destructive.spec.ts`
- Related flow: `CF-SCH-003`
- Evidence: `POST /compras` returns `success:false` with details
  `column "fecha_ultima_cuota_generada" does not exist`.
- Expected: A valid compra en cuotas payload should create a compra definition
  and return `201`/`success:true`.
- Actual: The API reaches persistence and fails because the current `Compra`
  model expects `fecha_ultima_cuota_generada`, but the staging database table
  does not contain that column.
- Proposed test: Covered by `CF-SCH-003` API destructive coverage.
- Fixed notes: Staging DB schema was aligned by adding
  `finanzas.compras.fecha_ultima_cuota_generada`.
- Tracking: Not created yet.

## BUG-2026-003 - Creating a debito automatico fails because staging DB schema is missing a model column

- Status: Fixed
- Severity: High
- Area: Backend API / Staging DB
- Found by: `tests/api/debitos-automaticos.destructive.spec.ts`
- Related flow: `CF-SCH-002`
- Evidence: `POST /debitos-automaticos` returns `success:false` with details
  `column "usa_vencimiento_tarjeta" of relation "debitos_automaticos" does not exist`.
- Expected: A valid debito automatico payload should create a scheduled debit
  definition and return `201`/`success:true`.
- Actual: The API reaches persistence and fails because the current
  `DebitoAutomatico` model/controller expects `usa_vencimiento_tarjeta`, but
  the staging database table does not contain that column.
- Proposed test: Covered by `CF-SCH-002` API destructive coverage.
- Fixed notes: Staging DB schema was aligned by adding
  `finanzas.debitos_automaticos.usa_vencimiento_tarjeta`.
- Tracking: Not created yet.

## BUG-2026-004 - Deleted gasto unico remains visible in UI after successful DELETE

- Status: Open
- Severity: High
- Area: Frontend UI / Data refresh
- Found by: `tests/ui/gastos-unicos.destructive.spec.ts`
- Related flow: `CF-EXP-001`
- Evidence: The UI flow creates a gasto unico, clicks delete, receives a
  successful `DELETE /gastos-unicos/:id` response, but the item remains visible
  in the gastos únicos list after waiting for the UI to update.
- Expected: After a successful delete, the deleted gasto should disappear from
  the visible list without requiring manual refresh.
- Actual: The deleted gasto card/row remains visible.
- Proposed test: Keep `CF-EXP-001` UI destructive coverage as an expected
  failure until the frontend refreshes/removes the item correctly; then remove
  `test.fail(...)`.
- Tracking: Not created yet.

## Template

```md
## BUG-YYYY-NNN - Short title

- Status:
- Severity:
- Area:
- Found by:
- Related flow:
- Evidence:
- Expected:
- Actual:
- Proposed test:
- Tracking:
```
