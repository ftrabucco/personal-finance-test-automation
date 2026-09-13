# Per-Suite Validation Matrix

## Objetivo

Definir que validaciones correr segun el tipo de cambio. La meta es encontrar
errores temprano sin ejecutar siempre la suite completa.

Esta matriz complementa el checklist pre-PR. Cada PR debe reportar:

- comandos ejecutados;
- resultado;
- comandos omitidos y motivo;
- riesgo residual.

## Baseline general

Para cambios de codigo, el baseline recomendado es:

```bash
npx tsc --noEmit
npm run test:contract
```

Agregar UI, destructive o prod smoke segun el area tocada.

## Matriz por tipo de cambio

| Cambio | Validacion minima | Validacion ampliada | Notas |
| --- | --- | --- | --- |
| Docs only | Revisar links/estructura con `rg` | No requiere Playwright | Indicar que no se corrieron tests por ser docs-only. |
| `package.json`, scripts o config Playwright | `npx tsc --noEmit` + comando afectado | `npm run test:contract` + suite relacionada | Validar que el script nuevo exista y sea ejecutable. |
| API clients | `npx tsc --noEmit` + `npm run test:contract` | Tests API destructivos si cambia create/update/delete | Los clients no deben contener assertions de test. |
| API assertions | `npx tsc --noEmit` + `npm run test:contract` | `npm run test:staging:destructive` si impacta helpers usados por destructivos | Revisar mensajes de error para debugging. |
| Builders | `npx tsc --noEmit` | `npm run test:staging:destructive` si el builder crea payloads usados por API/UI | Builders deben generar datos validos por defecto. |
| Fixtures | `npx tsc --noEmit` + `npm run test:contract` | `npm run test:ui:parallel` y destructivos si toca auth/session/metadata | Alto impacto porque las fixtures cruzan toda la suite. |
| Page Objects | `npx tsc --noEmit` + UI spec afectado | `npm run test:ui:parallel` | Validar locators accesibles y evitar duplicacion. |
| UI smoke/read-only | `npx tsc --noEmit` + spec afectado | `npm run test:ui:parallel` | Puede correr contra prod solo si es `@smoke-readonly`. |
| UI destructive | `npx tsc --noEmit` + spec afectado en Chromium | `npm run test:staging:destructive:ui` | Debe tener guard, cleanup y correr una sola vez salvo motivo cross-browser. |
| API contract | `npx tsc --noEmit` + `npm run test:contract` | `npm run test:staging:contract` si el cambio depende de staging | Debe ser rapido y estable. |
| API destructive | `npx tsc --noEmit` + spec afectado contra staging | `npm run test:staging:destructive` | Requiere `ALLOW_DESTRUCTIVE_TESTS=true` y cleanup en `finally`. |
| Safety guards | `npx tsc --noEmit` + tests que deberian bloquear/desbloquear | Validar manualmente que prod no permite destructivos | No relajar protecciones por conveniencia. |
| E2E metadata/observability | `npx tsc --noEmit` + `npm run test:contract` | Test UI/API que cree datos y adjunte metadata | Revisar headers `x-e2e-*` y attachments. |
| GitHub Actions | Revisar YAML + comando local equivalente | Ejecutar workflow manual si corresponde | No hardcodear secretos. |
| Playwright Agents/seed | `npm run test:agent-seed` | UI smoke si se cambia auth/seed | El output generado debe refactorizarse antes de mergear. |

## Comandos de referencia

### TypeScript

```bash
npx tsc --noEmit
```

### Contract API

```bash
npm run test:contract
```

### Smoke local

```bash
npm run test:smoke
```

### UI parallel

```bash
npm run test:ui:parallel
```

### Staging destructive API

```bash
npm run test:staging:destructive
```

### Staging destructive UI

```bash
npm run test:staging:destructive:ui
```

### Production read-only smoke

```bash
npm run test:prod:smoke
```

## Seleccion de specs puntuales

Cuando el cambio es pequeno, se puede correr un spec puntual antes de ampliar:

```bash
npx playwright test tests/api/auth.contract.spec.ts --project=api
npx playwright test tests/ui/navigation.smoke.spec.ts --project=chromium
```

Para destructivos puntuales, declarar ambiente y flag explicitamente:

```bash
TEST_ENV=staging ALLOW_DESTRUCTIVE_TESTS=true npx playwright test tests/api/gastos-unicos.destructive.spec.ts --project=api
```

## Reglas de escalamiento

Ampliar la validacion cuando:

- el cambio toca fixtures compartidas;
- cambia auth/session/localStorage/cookies;
- cambia metadata E2E;
- cambia cleanup o safety guards;
- cambia un helper usado por varias suites;
- se modifica un flujo P0/P1 critico;
- falla un test y el fix toca una capa compartida.

## Reporting en PR

Usar este formato:

```text
Validation:
- npx tsc --noEmit: passed
- npm run test:contract: passed
- npm run test:ui:parallel: not run, docs-only change

Residual risk:
- No browser behavior changed.
```

Si se omite una validacion recomendada, explicar por que.
