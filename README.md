# Personal Finance Test Automation

[![PR Checks](https://github.com/ftrabucco/personal-finance-test-automation/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/ftrabucco/personal-finance-test-automation/actions/workflows/pr-checks.yml)
![Playwright](https://img.shields.io/badge/Playwright-Test-2ead33)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)

Repositorio de automatizacion de pruebas para la aplicacion Personal Finance.
Combina estrategia de calidad, pruebas de contrato y API, automatizacion UI con
Playwright, controles de seguridad por ambiente y diagnostico de fallas en CI.

## Estado

Suite activa con cobertura automatizada sobre staging y smoke read-only contra
produccion. La implementacion incluye:

- contratos de autenticacion, catalogos y recursos protegidos;
- flujos UI de autenticacion, dashboard, navegacion, perfil y configuracion;
- CRUD y validaciones para gastos, ingresos, tarjetas y definiciones programadas;
- ejecuciones destructivas protegidas por ambiente y flag explicito;
- Page Objects, API Clients, fixtures, builders y factories tipadas;
- reportes de Playwright con traces, screenshots, video y metadata de triage;
- GitHub Actions para PR checks, suites manuales de staging y orquestacion de fallas.

El backlog y la matriz de cobertura siguen evolucionando junto con el producto.

## Repos relacionados

- [Frontend](https://github.com/ftrabucco/personal-finance-frontend)
- [API](https://github.com/ftrabucco/personal-finance-api-nodeJS)

## Arquitectura

```text
tests/
  api/          contratos, smoke read-only y flujos destructivos
  ui/           smoke y recorridos E2E por navegador
src/
  api/          clientes HTTP tipados por dominio
  assertions/   validaciones reutilizables
  builders/     payloads validos y configurables
  config/       ambientes, setup global y guardas de seguridad
  factories/    composicion de datos para flujos de negocio
  fixtures/     inyeccion de dependencias Playwright
  pages/        Page Objects
  reporting/    clasificacion y contexto de fallas
```

La explicacion completa esta en
[`docs/strategy/framework-architecture.md`](docs/strategy/framework-architecture.md).

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

## GitHub Actions

Configurar estos secrets en GitHub antes de ejecutar CI contra staging:

```text
E2E_STAGING_USER_EMAIL
E2E_STAGING_USER_PASSWORD
```

Ver detalles en [`docs/strategy/github-actions.md`](docs/strategy/github-actions.md).
