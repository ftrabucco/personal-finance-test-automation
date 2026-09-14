# Schema Drift Check

## Purpose

This read-only check validates critical database columns before running
destructive regression against staging.

It was added after staging missed columns that already existed in production:

- `finanzas.compras.fecha_ultima_cuota_generada`
- `finanzas.debitos_automaticos.usa_vencimiento_tarjeta`

## What It Checks

Expected columns live in:

```text
config/schema-drift/critical-columns.json
```

The script queries only `information_schema.columns`; it does not mutate data or
schema.

## Requirements

The machine running the check needs:

- PostgreSQL client `psql`.
- Network access to the database host.
- Read access to `information_schema`.

## Command

```bash
SCHEMA_DRIFT_DB_HOST=localhost \
SCHEMA_DRIFT_DB_PORT=5432 \
SCHEMA_DRIFT_DB_NAME=finanzas_personal_test \
SCHEMA_DRIFT_DB_USER=finanzas_user \
SCHEMA_DRIFT_DB_PASSWORD='<password>' \
npm run schema:drift:check
```

## Server Example

From `/opt/finanzas` on the server, values usually come from `.env.test` for
staging and `.env` for production.

```bash
cd /opt/finanzas
cat .env.test | grep -E 'DB_HOST|DB_PORT|DB_NAME|DB_USER'
```

Because the script runs from this automation repo, either run it from a machine
that can reach the DB directly, or use the SQL equivalent below inside `psql`.

## SQL Equivalent

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'finanzas'
  AND (
    (table_name = 'compras' AND column_name = 'fecha_ultima_cuota_generada')
    OR
    (table_name = 'debitos_automaticos' AND column_name = 'usa_vencimiento_tarjeta')
  )
ORDER BY table_name, column_name;
```

Expected result:

```text
compras             | fecha_ultima_cuota_generada | date
debitos_automaticos | usa_vencimiento_tarjeta     | boolean
```

## When To Run

- Before destructive staging regression.
- After backend deploys that include model or migration changes.
- Before validating scheduled expenses, purchases, installments, or automatic
  debits.
