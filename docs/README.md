# Documentacion

Este directorio concentra el analisis funcional, la estrategia de calidad y
los planes de prueba del producto.

## Estructura

```text
docs/
├── analysis/
│   ├── functional-inventory.md
│   ├── critical-flows.md
│   ├── api-inventory.md
│   └── coverage-matrix.md
├── environment/
│   └── staging-api-environment.md
├── strategy/
│   ├── automation-strategy.md
│   ├── automation-backlog.md
│   ├── e2e-observability.md
│   ├── github-actions.md
│   ├── git-strategy.md
│   ├── pr-review-checklist.md
│   ├── test-data-strategy.md
│   └── framework-architecture.md
└── test-plans/
    ├── master-test-plan.md
    └── smoke-test-plan.md
```

Los test plans por dominio se agregaran despues del inventario funcional. Se
organizaran por funcionalidad o comportamiento de negocio, no necesariamente
por pagina.

La documentacion de ambientes se encuentra en
[`environment/`](environment/staging-api-environment.md).

El checklist de review pre-PR se encuentra en
[`strategy/pr-review-checklist.md`](strategy/pr-review-checklist.md).

El backlog de cobertura y madurez del framework se encuentra en
[`strategy/automation-backlog.md`](strategy/automation-backlog.md).

La configuracion de GitHub Actions se encuentra en
[`strategy/github-actions.md`](strategy/github-actions.md).

La convencion de metadata E2E se encuentra en
[`strategy/e2e-observability.md`](strategy/e2e-observability.md).

## Flujo de trabajo

1. Analizar frontend y backend.
2. Completar el inventario funcional y de APIs.
3. Identificar dependencias, riesgos y flujos criticos.
4. Definir prioridades y cobertura por capa.
5. Preparar el master test plan y el smoke test plan.
6. Disenar la arquitectura del framework.
7. Implementar la infraestructura y luego los casos automatizados.
