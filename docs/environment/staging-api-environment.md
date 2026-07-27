# Ambiente API de staging/test

## Objetivo

Crear un ambiente de prueba para ejecutar tests API mas exhaustivos sin afectar
los datos productivos de Personal Finance.

La restriccion principal fue usar el mismo server que ya corre produccion. La
solucion elegida fue aislar por base de datos, puerto, contenedor de API y
entrada de Caddy.

## Arquitectura final

```text
Mismo server
├── finanzas-db
│   ├── finanzas_personal       # prod
│   └── finanzas_personal_test  # staging/test
├── finanzas-api                # prod, puerto 3030
└── finanzas-api-test           # staging/test, puerto 3032

Caddy
├── https://178-156-224-127.sslip.io           -> localhost:3030
└── https://api-test.178-156-224-127.sslip.io  -> localhost:3032
```

## Variables clave

El ambiente test usa un `.env.test` separado en el server:

```env
NODE_ENV=production
PORT=3032

DB_HOST=postgres
DB_PORT=5432
DB_NAME=finanzas_personal_test
DB_USER=finanzas_user
DB_PASSWORD=<redacted>
DB_SSL=false

JWT_SECRET=<test-only-secret>

CORS_ORIGIN=https://personal-finance-frontend-pied.vercel.app
APP_URL=https://api-test.178-156-224-127.sslip.io

SCHEDULER_ENABLED=false
MCP_ENABLED=false
```

`NODE_ENV=production` se mantiene porque la app no levanta servidor cuando
`NODE_ENV=test`. El aislamiento real lo dan `DB_NAME`, `PORT`, `APP_URL`, CORS
y schedulers apagados.

## Cambios necesarios en backend

Durante la creacion del ambiente aparecieron diferencias entre el codigo actual
y el schema/migraciones historicas. Se versionaron estos cambios en el backend:

- `.dockerignore`: la imagen Docker debe incluir `init.sql` y `migrations/`.
- `Dockerfile`: el healthcheck usa `PORT`, para funcionar en `3030` y `3032`.
- `026_add_usuario_id_to_tarjetas.sql`: agrega `usuario_id` nullable a tarjetas.
- `027_fix_tarjetas_due_date_constraint.sql`: ajusta el constraint de fechas de
  tarjeta al par de columnas usado por el modelo.
- `028_add_usuario_id_to_expense_sources.sql`: agrega `usuario_id` nullable a
  tablas fuente de gastos/compras.
- `seed.js`: incluye campos multi-moneda al crear datos de ejemplo.

Las migraciones de ownership son conservadoras: no asignan registros historicos
de prod a un usuario arbitrario y no fuerzan `NOT NULL`.

## Creacion de la DB test

Crear o recrear solo la DB test:

```bash
docker exec finanzas-db psql -U finanzas_user -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'finanzas_personal_test';"

docker exec finanzas-db dropdb -U finanzas_user --if-exists finanzas_personal_test
docker exec finanzas-db createdb -U finanzas_user -O finanzas_user finanzas_personal_test
```

Inicializar schema y migraciones:

```bash
cd /opt/finanzas
docker exec -i finanzas-db psql -U finanzas_user -d finanzas_personal_test < /opt/finanzas/api/init.sql
docker compose exec api sh -lc 'DB_NAME=finanzas_personal_test NODE_ENV=production SCHEDULER_ENABLED=false MCP_ENABLED=false npm run db:migrate'
```

Seed inicial:

```bash
docker compose exec api sh -lc 'DB_NAME=finanzas_personal_test NODE_ENV=production SCHEDULER_ENABLED=false MCP_ENABLED=false npm run seed-db'
```

## Servicio Docker test

El `docker-compose.yml` del server incluye:

```yaml
  api-test:
    build: ./api
    image: finanzas-api:latest
    container_name: finanzas-api-test
    restart: always
    env_file: .env.test
    ports:
      - "3032:3032"
    depends_on:
      postgres:
        condition: service_healthy
```

Levantarlo:

```bash
cd /opt/finanzas
docker compose up -d --build api-test
```

## Caddy

Config actual:

```caddy
178-156-224-127.sslip.io {
	reverse_proxy localhost:3030
}

api-test.178-156-224-127.sslip.io {
	reverse_proxy localhost:3032
}
```

Validar y recargar:

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

## Validaciones

Healthchecks:

```bash
curl -i http://localhost:3030/health
curl -i http://localhost:3032/health
curl -i https://api-test.178-156-224-127.sslip.io/health
```

Login contra test:

```bash
curl -sS -X POST https://api-test.178-156-224-127.sslip.io/api/auth/login \
  -H "Content-Type: application/json" \
  --data '{"email":"francisco@gmail.com","password":"password123"}'
```

Estado esperado:

```text
finanzas-api       healthy
finanzas-api-test  healthy
finanzas-db        healthy
```

## Tests automatizados

En este repo:

```bash
npm run test:staging:contract
npm run test:staging:api
```

Resultado validado:

```text
2 passed
```

## Riesgos y cuidados

- No correr `docker compose down -v` en el server: borra volumenes y puede
  eliminar datos productivos.
- No usar la misma DB para prod y test.
- No ejecutar migraciones que asignen ownership historico a un usuario por
  defecto sin analizar datos.
- Mantener schedulers apagados en test para evitar procesos automaticos no
  deseados.
- No reutilizar `JWT_SECRET` productivo en test si se puede evitar.

## Proximos pasos

1. Agregar GitHub Actions para ejecutar API staging tests.
2. Crear tests API destructivos seguros contra `finanzas_personal_test`.
3. Crear frontend test apuntando a `api-test`.
4. Definir un comando de reset/seed reproducible para staging.

## Notas para compartir el caso

Estructura recomendada para un post:

1. Problema: necesitaba pruebas mas exhaustivas sin tocar datos reales.
2. Restriccion: solo habia un server disponible.
3. Decision: aislar por DB, API, puerto y reverse proxy.
4. Hallazgos: Docker no incluia migraciones, seed/schema estaban desalineados.
5. Resultado: ambiente API test funcionando y Playwright API verde.
6. Aprendizaje: crear staging tambien prueba migraciones, deployabilidad y
   calidad de datos, no solo endpoints.
