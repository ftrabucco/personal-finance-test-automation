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
├── strategy/
│   ├── automation-strategy.md
│   ├── test-data-strategy.md
│   └── framework-architecture.md
└── test-plans/
    ├── master-test-plan.md
    └── smoke-test-plan.md
```

Los test plans por dominio se agregaran despues del inventario funcional. Se
organizaran por funcionalidad o comportamiento de negocio, no necesariamente
por pagina.

## Flujo de trabajo

1. Analizar frontend y backend.
2. Completar el inventario funcional y de APIs.
3. Identificar dependencias, riesgos y flujos criticos.
4. Definir prioridades y cobertura por capa.
5. Preparar el master test plan y el smoke test plan.
6. Disenar la arquitectura del framework.
7. Implementar la infraestructura y luego los casos automatizados.

