# Playwright Reporting and Artifacts

## Objetivo

Definir como revisar ejecuciones localmente y en CI usando el reporte nativo de
Playwright, traces, screenshots y videos.

## Respuesta corta sobre Allure

Allure es un buen camino si necesitamos reportes muy narrativos, steps
customizados, adjuntos ricos por bloque y una experiencia historica mas cercana
a test management.

Para este repo, la recomendacion actual es:

1. Exprimir primero el reporte nativo de Playwright.
2. Agregar steps y attachments de Playwright cuando necesitemos mas contexto.
3. Evaluar Allure mas adelante, cuando tengamos mas volumen de suites y una
   necesidad concreta de reportes historicos o dashboards mas ricos.

Playwright ya nos da:

- HTML report;
- trace viewer con DOM, network, console, actions y snapshots;
- screenshots;
- videos;
- attachments por test;
- metadata E2E adjunta por fixture.

## Defaults

El framework conserva artifacts principalmente cuando hay fallas, para que las
ejecuciones normales sean livianas pero las fallas queden diagnosticables.

Default actual:

```text
E2E_TRACE=retain-on-failure
E2E_SCREENSHOT=only-on-failure
E2E_VIDEO=retain-on-failure
```

Estos defaults viven en `playwright.config.ts`.

## Comandos locales

### Abrir ultimo reporte

```bash
npm run test:report
```

Esto abre `playwright-report/`.

### Ejecutar UI con artifacts completos

```bash
npm run test:ui:review
```

Este comando corre UI en Chromium, serializado, con:

```text
E2E_TRACE=on
E2E_SCREENSHOT=on
E2E_VIDEO=on
E2E_WORKERS=1
```

Usarlo para revisar paso a paso que datos se envian, que catalogos se eligen y
como se comporta la UI. No es el comando recomendado para CI porque genera mas
artifacts y tarda mas.

### Ejecutar destructivos UI con artifacts completos

```bash
npm run test:staging:destructive:ui:review
```

Usarlo cuando se quiere auditar un flujo real contra staging, por ejemplo crear
y borrar gasto/ingreso desde UI.

## Variables de artifacts

La configuracion de Playwright permite ajustar artifacts con env vars:

| Variable | Valores utiles | Default |
| --- | --- | --- |
| `E2E_TRACE` | `on`, `retain-on-failure`, `on-first-retry`, `off` | `retain-on-failure` |
| `E2E_SCREENSHOT` | `on`, `only-on-failure`, `off` | `only-on-failure` |
| `E2E_VIDEO` | `on`, `retain-on-failure`, `on-first-retry`, `off` | `retain-on-failure` |

Ejemplo puntual:

```bash
E2E_TRACE=on E2E_SCREENSHOT=on E2E_VIDEO=on npx playwright test tests/ui/gastos-unicos.destructive.spec.ts --project=chromium
```

## Politica de retention

### Local

Artifacts locales viven en:

```text
playwright-report/
test-results/
```

No deben commitearse. Se usan para debug/review y pueden borrarse cuando ya no
sirvan.

### CI

GitHub Actions sube:

- `playwright-report/`
- `test-results/`

Esto aplica a:

- PR checks.
- Ejecuciones manuales destructivas de staging.

Retention actual:

```text
7 dias
```

Esto mantiene suficiente contexto para revisar PRs y fallas recientes sin
acumular artifacts innecesarios.

## Como revisar una ejecucion

1. Correr una suite con artifacts completos si se quiere investigar:

   ```bash
   npm run test:ui:review
   ```

2. Abrir el reporte:

   ```bash
   npm run test:report
   ```

3. Entrar al test de interes.
4. Revisar attachments:
   - `e2e-metadata`;
   - trace;
   - screenshot;
   - video.
5. En trace viewer mirar:
   - acciones realizadas;
   - snapshots de DOM;
   - requests/responses;
   - console logs;
   - timing de cada paso.

## Carpeta de triage (`triage/`)

Ademas del reporte HTML nativo, `TriageReporter`
(`src/reporting/TriageReporter.ts`) genera una carpeta autocontenida por
ejecucion, pero solo cuando hay fallas:

```text
triage/<testRunId>/
├── index.md                     # tabla resumen de fallas con clasificacion sugerida
├── summary.json                 # mismo contenido en formato maquina-legible
└── <flowId>-<test>-r<retry>-w<worker>/
    ├── trace.zip
    ├── video.webm
    ├── screenshot.png
    └── error-context.md
```

Por cada falla tambien se genera un Markdown de diagnostico
(`<slug>.md`) junto al `index.md`, con:

- metadata E2E (`testRunId`, `correlationId`, `flowId`);
- mensaje y stack del error (sin codigos ANSI);
- una clasificacion sugerida por heuristica
  (`app-bug`, `test-bug`, `data-issue`, `environment-issue`,
  `infrastructure-issue` o `unclassified`) definida en
  `src/reporting/failureClassifier.ts`;
- un campo `Final classification` para completar a mano.

La clasificacion es solo un primer indicio, no un veredicto: siempre requiere
revision manual antes de tratarla como bug de producto o de test.

`triage/` es local y no se commitea (ver `.gitignore`), igual que
`playwright-report/` y `test-results/`.

### TEST_RUN_ID compartido

`src/config/globalSetup.ts` fija `process.env.TEST_RUN_ID` una sola vez antes
de levantar los workers, para que todos los workers y el reporter usen el
mismo id de corrida. `getTestRunId()` en `src/utils/e2eObservability.ts` lee
esa variable de forma perezosa (no al importar el modulo), evitando que cada
proceso genere su propio id si se llama antes de que `globalSetup` corra.

## Cuando considerar Allure

Allure seria especialmente util si queremos:

- steps funcionales escritos a mano, por ejemplo `Crear gasto`, `Validar
  historial`, `Eliminar gasto`;
- adjuntar payloads/responses formateados por bloque;
- agrupar por feature/story/severity;
- mostrar historial de ejecuciones por suite;
- entregar un reporte mas ejecutivo o estilo QA management.

Antes de adoptarlo, conviene tener claro:

- costo de dependencia extra;
- configuracion CI;
- convencion de steps;
- que agrega sobre trace viewer;
- si el portfolio se beneficia de mostrar ambos: Playwright trace + Allure.

Decision actual: **no incorporar Allure todavia**. Primero mejorar el uso del
report nativo y agregar steps/attachments Playwright donde duela.
