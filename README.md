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
