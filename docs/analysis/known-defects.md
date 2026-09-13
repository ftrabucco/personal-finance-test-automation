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
