import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const manifestPath = resolve(process.cwd(), 'config/schema-drift/critical-columns.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const dbConfig = {
  host: readRequiredEnv('SCHEMA_DRIFT_DB_HOST'),
  port: process.env.SCHEMA_DRIFT_DB_PORT || '5432',
  database: readRequiredEnv('SCHEMA_DRIFT_DB_NAME'),
  user: readRequiredEnv('SCHEMA_DRIFT_DB_USER'),
  password: readRequiredEnv('SCHEMA_DRIFT_DB_PASSWORD'),
}

const expectedColumns = Object.entries(manifest.tables).flatMap(([tableName, columns]) =>
  Object.entries(columns).map(([columnName, dataType]) => ({
    table_schema: manifest.schema,
    table_name: tableName,
    column_name: columnName,
    data_type: dataType,
  })),
)

const query = `
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = '${escapeSqlLiteral(manifest.schema)}'
  AND (${expectedColumns
    .map(
      (column) =>
        `(table_name = '${escapeSqlLiteral(column.table_name)}' AND column_name = '${escapeSqlLiteral(column.column_name)}')`,
    )
    .join(' OR ')})
ORDER BY table_name, column_name;
`

const result = spawnSync('psql', [
  '--host',
  dbConfig.host,
  '--port',
  dbConfig.port,
  '--username',
  dbConfig.user,
  '--dbname',
  dbConfig.database,
  '--tuples-only',
  '--no-align',
  '--field-separator',
  '\t',
  '--command',
  query,
], {
  env: {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  },
  encoding: 'utf8',
})

if (result.error) {
  throw new Error(`Failed to execute psql. Is PostgreSQL client installed? ${result.error.message}`)
}

if (result.status !== 0) {
  console.error(result.stderr.trim())
  process.exit(result.status ?? 1)
}

const actualColumns = new Map(
  result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [table_schema, table_name, column_name, data_type] = line.split('\t')
      return [
        columnKey({ table_schema, table_name, column_name }),
        { table_schema, table_name, column_name, data_type },
      ]
    }),
)

const failures = []

for (const expected of expectedColumns) {
  const actual = actualColumns.get(columnKey(expected))

  if (!actual) {
    failures.push(`Missing column: ${expected.table_schema}.${expected.table_name}.${expected.column_name}`)
    continue
  }

  if (actual.data_type !== expected.data_type) {
    failures.push(
      `Type mismatch: ${expected.table_schema}.${expected.table_name}.${expected.column_name} expected ${expected.data_type}, got ${actual.data_type}`,
    )
  }
}

if (failures.length > 0) {
  console.error('Schema drift check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Schema drift check passed for ${dbConfig.database}.`)
for (const expected of expectedColumns) {
  console.log(`- ${expected.table_schema}.${expected.table_name}.${expected.column_name}: ${expected.data_type}`)
}

function readRequiredEnv(name) {
  const value = process.env[name]

  if (!value?.trim()) {
    console.error(`Missing required env var: ${name}`)
    console.error('See docs/environment/schema-drift-check.md for usage.')
    process.exit(1)
  }

  return value.trim()
}

function columnKey(column) {
  return `${column.table_schema}.${column.table_name}.${column.column_name}`
}

function escapeSqlLiteral(value) {
  return String(value).replaceAll("'", "''")
}
