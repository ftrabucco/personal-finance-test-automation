# Estrategia de datos de prueba

## Objetivo

Definir creacion, aislamiento, identificacion y limpieza de datos, usuarios de
automatizacion y manejo de secretos por ambiente.

## Politica por ambiente

### Produccion

Solo se permite ejecutar pruebas read-only con usuario E2E dedicado.

Permitido:

- login;
- perfil;
- dashboard;
- lectura de catalogos;
- lectura de historiales;
- validaciones visuales sin mutacion.

No permitido:

- crear, editar o borrar datos;
- procesar pendientes;
- cambiar preferencias;
- cambiar tipo de cambio;
- ejecutar pruebas de rate limit.

### Staging/test

Ambiente principal para pruebas destructivas. Debe usar DB aislada,
schedulers apagados y datos descartables.

Requisitos:

- `TEST_ENV=staging`;
- `ALLOW_DESTRUCTIVE_TESTS=true`;
- usuario E2E dedicado;
- datos con prefijo `E2E-`;
- cleanup por API.

Comando recomendado:

```bash
npm run test:staging:destructive
```

### Local

Permitido para desarrollo del framework y debugging. Puede ejecutar destructivos
solo con `ALLOW_DESTRUCTIVE_TESTS=true`.

## Convenciones de datos

- Todo dato creado por automation usa prefijo `E2E-`.
- Los builders generan datos validos por defecto.
- Cada test modifica solo los campos relevantes para su escenario.
- Los IDs creados se guardan dentro del test para cleanup.
- Cuando un test falle, los artifacts de Playwright ayudan a diagnosticar sin
  depender de datos productivos.

## Cleanup

La limpieza debe ocurrir en un bloque `finally` cuando el test crea datos. Para
flujos UI, la limpieza preferida tambien es por API porque es mas rapida y
menos fragil.

Ejemplo conceptual:

```ts
let gastoId: number | undefined

try {
  // crear y validar
} finally {
  if (gastoId) {
    await gastosUnicosApi.delete(token, gastoId)
  }
}
```

## Safety guard

Los tests destructivos deben usar `requireDestructiveTestsAllowed()` antes de
crear, editar, procesar o borrar datos. El guard bloquea siempre produccion y
exige `ALLOW_DESTRUCTIVE_TESTS=true` para staging/local.

## Estado

Definicion inicial lista. Falta incorporar factories para variantes mas
complejas y un reset/seed reproducible del ambiente staging.
