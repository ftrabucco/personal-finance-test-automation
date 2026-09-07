# Git strategy

## Objetivo

Mantener el repo de automatizacion ordenado, revisable y facil de evolucionar.

## Flujo acordado

1. `main` queda como rama estable.
2. Los cambios nuevos se trabajan en feature branches.
3. Las feature branches usan prefijo `feature/`.
4. Fran revisa los cambios antes de mergear.
5. El merge a `main` se hace por Pull Request cuando el cambio esta aprobado.

## Convencion de ramas

```text
feature/<descripcion-corta>
```

Ejemplos:

```text
feature/api-p0-tests
feature/ui-expenses-flow
feature/github-actions-staging
```

## Situacion actual

El proyecto venia trabajando sobre `main`. A partir de ahora, los siguientes
cambios deben hacerse en feature branches para facilitar revision y trazabilidad.
