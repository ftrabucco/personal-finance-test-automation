# Test Tagging Strategy

## Objetivo

Definir una convencion consistente de tags para seleccionar suites por riesgo,
capa, dominio, ambiente y prioridad sin depender de nombres de archivos.

Los tags deben permitir responder rapido:

- que corro antes de mergear;
- que corro en CI;
- que corro contra produccion sin mutar datos;
- que corro contra staging con datos descartables;
- que cobertura existe para un flujo `CF-*`.

## Tags obligatorios

Todo `describe` o test automatizado debe tener, directa o indirectamente, estos
tags:

| Tipo | Formato | Ejemplos |
| --- | --- | --- |
| Capa | `@api`, `@ui` | `@api`, `@ui` |
| Suite | `@contract`, `@smoke`, `@destructive` | `@contract`, `@smoke-readonly` |
| Dominio | `@auth`, `@gastos`, `@ingresos`, `@dashboard` | `@catalogos`, `@navigation` |
| Prioridad | `@P0`, `@P1`, `@P2`, `@P3` | `@P0` |

El ID funcional `CF-*` debe vivir en el titulo del test, no solo como tag. Esto
permite que la metadata E2E extraiga `flowId` automaticamente.

Ejemplo:

```ts
test.describe('Gastos history API destructive @destructive @api @gastos @P0', () => {
  test('CF-EXP-002 lists a gasto unico as consolidated history', async ({}) => {
    // ...
  })
})
```

## Suites principales

### `@contract`

Contrato HTTP o de respuesta. Debe ser rapido, estable y preferentemente
read-only.

Comando:

```bash
npm run test:contract
```

### `@smoke`

Cobertura minima de salud funcional. Puede incluir API y UI, pero debe evitar
escenarios largos o fragiles.

Comando:

```bash
npm run test:smoke
```

### `@smoke-readonly`

Subset seguro para produccion. No puede crear, editar, borrar, procesar
pendientes, cambiar configuracion ni ejecutar escenarios de rate limit.

Comando:

```bash
npm run test:prod:smoke
```

### `@destructive`

Tests que crean, editan, borran o procesan datos. Solo pueden ejecutarse en
local/staging con `ALLOW_DESTRUCTIVE_TESTS=true` y cleanup definido.

Comandos:

```bash
npm run test:staging:destructive
npm run test:staging:destructive:ui
```

## Prioridades

| Tag | Uso |
| --- | --- |
| `@P0` | Flujos criticos o contratos base. Deben mantenerse estables. |
| `@P1` | Cobertura importante de producto o framework. |
| `@P2` | Valor adicional, regresion amplia o portfolio avanzado. |
| `@P3` | UX, exploratorio o compatibilidad de menor riesgo. |

La prioridad debe reflejar riesgo de negocio, no dificultad tecnica.

## Dominios

Tags de dominio actuales:

- `@auth`
- `@catalogos`
- `@gastos`
- `@ingresos`
- `@dashboard`
- `@navigation`
- `@configuracion`
- `@perfil`

Nuevos dominios deben agregarse cuando existan tests reales, no por adelantado.

## Reglas de combinacion

- Un test destructivo no debe llevar `@smoke-readonly`.
- Un test productivo seguro debe llevar `@smoke-readonly`.
- Un test UI debe llevar `@ui`; un test API debe llevar `@api`.
- Un test P0 debe tener un `CF-*` trazable en matriz o backlog.
- Los tests generados con Playwright Agents deben ser refactorizados para usar
  la misma convencion antes de mergear.

## Checklist para nuevos tests

Antes de abrir PR, verificar:

- [ ] El titulo incluye `CF-*`.
- [ ] La capa esta tagueada con `@api` o `@ui`.
- [ ] La suite esta tagueada con `@contract`, `@smoke`, `@smoke-readonly` o
      `@destructive`.
- [ ] El dominio esta tagueado.
- [ ] La prioridad esta tagueada.
- [ ] Si es destructivo, tiene guard y cleanup.
- [ ] Si crea datos, usa metadata E2E y prefijo `E2E-`.
