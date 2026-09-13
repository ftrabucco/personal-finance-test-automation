# Flaky Test Policy and Quarantine Process

## Objetivo

Evitar que la suite pierda confianza. Un test flaky es un problema de calidad
del framework o del producto, no ruido aceptable.

Esta politica define como detectar, clasificar, aislar y resolver flakiness sin
ocultar regresiones reales.

## Definicion

Un test se considera flaky cuando falla sin cambio funcional relevante y luego
pasa al reintentar en el mismo ambiente, con los mismos datos y configuracion.

Ejemplos:

- selector UI inestable;
- espera basada en tiempo fijo;
- dependencia de orden entre tests;
- datos compartidos entre workers;
- backend responde tarde o procesa asincronicamente;
- ambiente staging degradado;
- bug real intermitente de la app.

## Principios

- No se borra un test flaky sin reemplazo o decision documentada.
- No se baja la assertion para hacerlo pasar si la expectativa de negocio sigue
  siendo correcta.
- No se agrega `waitForTimeout` como arreglo permanente.
- No se marca como flaky algo que falla siempre: eso es bug o contrato roto.
- Todo test en cuarentena debe tener motivo y plan de salida.

## Clasificacion inicial

Cuando un test falla intermitentemente, clasificarlo como:

| Tipo | Descripcion | Accion |
| --- | --- | --- |
| App bug | La app falla de forma real o intermitente | Registrar en `known-defects.md` |
| Test bug | Selector, timing, data setup o assertion incorrecta | Corregir framework/test |
| Data issue | Datos compartidos, sucios o no aislados | Mejorar builders/cleanup |
| Environment issue | Staging, red, deploy o servicio externo | Documentar incidente |
| Infrastructure issue | CI/browser/dependency/artifact | Ajustar pipeline |

## Proceso de triage

1. Revisar reporte, trace, screenshot/video y `e2e-metadata`.
2. Reproducir local o contra staging con el mismo comando.
3. Revisar si el `correlationId` aparece en logs backend.
4. Clasificar la falla.
5. Corregir inmediatamente si el fix es chico y seguro.
6. Si no puede corregirse en el momento, documentar y poner en cuarentena.

## Quarantine

La cuarentena es temporal. Se usa para evitar bloquear CI mientras se investiga
una falla intermitente ya conocida.

Convencion recomendada:

```ts
test.describe('Feature @ui @gastos @P1 @quarantine', () => {
  test.fixme(true, 'QUAR-001: selector unstable after UI redesign')
})
```

Reglas:

- usar tag `@quarantine`;
- incluir ID `QUAR-*` en el motivo;
- registrar el caso en esta misma politica o en un futuro registro dedicado;
- mantener el test visible, no eliminarlo silenciosamente;
- revisar cuarentena antes de cada release o hito de cobertura.

Mientras no exista suite separada de quarantine, los tests en cuarentena deben
quedar deshabilitados con `test.fixme` o `test.skip` y motivo explicito.

## Politica de retries

Los retries pueden ayudar a diagnosticar, pero no reemplazan el fix.

Uso permitido:

- CI puede tener retries bajos para diferenciar falla deterministica de flaky.
- No usar retries para ocultar tests inestables recurrentes.
- Si un test necesita retry para pasar seguido, debe entrar en triage.

## Preferencias tecnicas

Para reducir flakiness:

- preferir locators por rol/texto accesible antes que CSS fragil;
- esperar respuestas de red cuando la accion depende de backend;
- usar `expect.poll` para procesos asincronicos reales;
- aislar datos por `testRunId`, `correlationId` y prefijo `E2E-`;
- limpiar datos en `finally`;
- evitar dependencias entre tests;
- limitar destructivos UI a Chromium salvo que el objetivo sea cross-browser.

## Definition of Done para sacar de cuarentena

- [ ] La causa fue identificada.
- [ ] El fix esta implementado.
- [ ] El test pasa al menos 3 veces contra el ambiente objetivo.
- [ ] No depende de datos manuales no documentados.
- [ ] La razon de quarantine fue removida o actualizada.
- [ ] Si habia bug de producto, esta registrado como resuelto.
