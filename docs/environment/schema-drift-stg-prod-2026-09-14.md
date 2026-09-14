# Schema Drift STG vs PROD - 2026-09-14

## Summary

During P1 scheduled expense automation, API tests for purchases and automatic
debits failed in staging while the same user flows worked in production.

The failure was caused by schema drift: staging was running backend code that
expected columns already present in production, but missing from the staging
database.

## Impact

- `POST /compras` failed in staging.
- `POST /debitos-automaticos` failed in staging.
- P1 tests for `CF-SCH-002` and `CF-SCH-003` initially had to be marked as
  expected failures until staging was aligned.

## Evidence

Staging API errors:

```text
column "fecha_ultima_cuota_generada" does not exist
column "usa_vencimiento_tarjeta" of relation "debitos_automaticos" does not exist
```

Production read-only schema check confirmed both columns existed:

```text
compras.fecha_ultima_cuota_generada -> date
debitos_automaticos.usa_vencimiento_tarjeta -> boolean
```

## Root Cause

Staging database `finanzas_personal_test` was missing schema changes that were
already present in production database `finanzas_personal`.

The backend code expected the current model shape, but staging DB had an older
table structure.

## Resolution

The missing staging columns were added in schema `finanzas`:

```sql
ALTER TABLE finanzas.compras
ADD COLUMN IF NOT EXISTS fecha_ultima_cuota_generada DATE;

ALTER TABLE finanzas.debitos_automaticos
ADD COLUMN IF NOT EXISTS usa_vencimiento_tarjeta BOOLEAN NOT NULL DEFAULT false;
```

Then `api-test` was recreated:

```bash
cd /opt/finanzas
docker compose up -d --build --force-recreate api-test
```

After the fix:

```bash
npm run test:staging:destructive
```

passed with all destructive API tests green.

## Follow-Up

- Add a read-only schema drift check for critical tables/columns before running
  destructive regression.
- Prefer versioned backend migrations over manual database edits.
- Keep staging schema aligned with production before validating scheduled
  expense flows.
