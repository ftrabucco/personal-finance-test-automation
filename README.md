# Personal Finance Test Automation

Repositorio de automatizacion de pruebas para la aplicacion Personal Finance.
Incluye estrategia, planes de prueba, automatizacion de UI con Playwright y
pruebas directas de API.

## Estado

Fase inicial de analisis y planificacion. Antes de implementar tests se
documentaran:

- funcionalidades y reglas de negocio;
- flujos E2E criticos;
- inventario y cobertura de APIs;
- riesgos y prioridades;
- estrategia de datos y ambientes;
- test plans;
- arquitectura del framework de automatizacion.

## Repos relacionados

- `personal-finance-frontend`
- `personal-finance-api-nodeJS`

## Documentacion

La documentacion de analisis y estrategia se encuentra en [`docs/`](docs/README.md).

## Primeros comandos

Instalar dependencias:

```bash
npm install
npm run install:browsers
```

Configurar variables:

```bash
cp .env.example .env
```

Ejecutar smoke read-only contra produccion:

```bash
TEST_ENV=prod npm run test:prod:smoke
```

Ejecutar smoke local:

```bash
npm run test:smoke
```

Ejecutar contrato API contra staging/test:

```bash
npm run test:staging:contract
```

Ejecutar API destructivos contra staging/test:

```bash
npm run test:staging:destructive
```

Ejecutar UI destructivos contra staging/test:

```bash
npm run test:staging:destructive:ui
```

Ejecutar UI smoke en paralelo:

```bash
npm run test:ui:parallel
```

Validar el seed usado por Playwright Agents:

```bash
npm run test:agent-seed
```

## Playwright Agents

El repo incluye agentes oficiales de Playwright para Codex en `.codex/agents/`:

- `playwright_test_planner`
- `playwright_test_generator`
- `playwright_test_healer`

Los planes generados viven en [`specs/`](specs/README.md). El codigo generado por agents se trata como borrador hasta adaptarlo a los patrones del framework.

## Review pre-PR

Antes de pushear o abrir PR, usar la skill local `test-automation-pr-review` y el checklist:

```text
.agents/skills/test-automation-pr-review/SKILL.md
docs/strategy/pr-review-checklist.md
```
