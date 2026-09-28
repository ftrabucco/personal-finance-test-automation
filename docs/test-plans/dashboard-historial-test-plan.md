# Dashboard & Historial de Gastos — Test Plan

## Objetivo

Cerrar la brecha entre lo que `critical-flows.md`/`coverage-matrix.md` definieron
para `CF-DASH-001`, `CF-CONF-003`, `CF-ANL-001`, `CF-ANL-002` y `CF-EXP-002`
a `CF-EXP-006`, y lo que realmente existe hoy en la suite. Este documento no
redefine prioridad o riesgo (eso ya está en `coverage-matrix.md`); traduce esos
IDs en escenarios concretos, listos para implementar, y marca con precisión qué
ya está cubierto vs qué falta.

## Estado actual (relevado 2026-09-28)

### Dashboard

El dashboard (`/`) tiene 3 tarjetas de resumen siempre visibles (Gastos del
Mes, Ingresos del Mes, Balance Neto) **más 8 secciones configurables** vía
`dashboard_sections` en preferencias (`src/types/models.ts` en el frontend):
`balance_acumulado`, `tasa_ahorro`, `evolucion_tabla`, `ingresos_vs_gastos`,
`gastos_categoria`, `desglose_mes`, `gastos_recientes`, `proyeccion`.

- **Cubierto:** las 3 tarjetas de resumen (`CF-DASH-001`, en
  `tests/ui/dashboard.smoke.spec.ts` y `tests/ui/dashboard.destructive.spec.ts`,
  más el reflejo de generación programada en
  `tests/ui/scheduled-generation.destructive.spec.ts`, `CF-SCH-GEN-005`).
- **Sin cobertura:** las 8 secciones configurables, la personalización en sí
  (`CF-CONF-003` — ocultar/mostrar y persistir), `/salud-financiera`
  (`CF-ANL-002`) y `/proyecciones` (`CF-ANL-001`) como páginas propias.

### Historial de gastos

`GastosHistorial.tsx` (componente que alimenta la pestaña "Historial") tiene:
búsqueda por texto, filtro por `tipo_origen`, categoría, importancia (como
toggle buttons) y rango de fechas; agrupación por fecha o categoría con
subtotales; paginación; expandir detalle de fila; exportar; editar y eliminar;
y filtros pre-cargables por query string (`cat`, `from`, `to`, `imp`).

- **Cubierto:** `CF-EXP-001` (alta+historial), `CF-EXP-002` (historial
  consolidado, `tests/api/gastos-history.destructive.spec.ts`), `CF-EXP-005`
  parcial — categoría y fecha, API+UI
  (`tests/api/unique-transaction-filters.destructive.spec.ts`,
  `tests/ui/unique-transaction-filters.destructive.spec.ts`), moneda bloqueada
  por `BUG-2026-005`, `CF-EXP-003` parcial — edición solo a nivel API
  (`tests/api/gastos-unicos.destructive.spec.ts`).
- **Sin cobertura:** filtro por `tipo_origen`, filtro por importancia, búsqueda
  por texto libre, agrupación (date/category) con subtotales, paginación,
  deep-linking completo por URL, edición desde UI (`CF-EXP-003` en UI),
  eliminación desde UI fuera del caso ya cubierto en creación, y `CF-EXP-006`
  (exportar) por completo.

## Escenarios propuestos

Formato Gherkin, con el CF-ID que corresponde según `critical-flows.md`. Cada
uno lleva una nota de capa sugerida (API/UI/unidad), siguiendo el criterio ya
fijado en `coverage-matrix.md` de mantener la UI liviana y empujar las reglas
exhaustivas a API/unidad.

### Dashboard: secciones configurables (nuevo tramo de `CF-DASH-001`)

```gherkin
Feature: Secciones del dashboard reflejan datos reales

  Scenario: Balance Acumulado incluye el balance inicial
    Given un usuario con balance_inicial configurado en preferencias
    And gastos e ingresos conocidos dentro y fuera del mes actual
    When visita el dashboard
    Then la sección "Balance Acumulado" muestra balance_inicial + ingresos - gastos acumulados a la fecha

  Scenario: Tasa de Ahorro se calcula sobre el mes actual
    Given ingresos y gastos conocidos del mes actual
    When visita el dashboard
    Then la sección "Tasa de Ahorro" muestra (ingresos - gastos) / ingresos, redondeado igual que el backend

  Scenario: Evolución Mensual lista los últimos N meses en orden
    Given gastos e ingresos en al menos 3 meses distintos
    When visita el dashboard
    Then la tabla "Evolución Mensual" lista los meses en orden cronológico
    And cada fila coincide con el total real de ese mes (GET /balance/evolucion)

  Scenario: Ingresos vs Gastos refleja el mes actual
    Given ingresos y gastos del mes actual con montos distintos
    When visita el dashboard
    Then la sección "Ingresos vs Gastos" muestra ambos totales consistentes con /gastos/summary e /ingresos/summary

  Scenario: Gastos por Categoría ordena de mayor a menor
    Given gastos del mes en al menos 3 categorías con montos distintos
    When visita el dashboard
    Then la sección "Gastos por Categoría" lista las categorías ordenadas por monto descendente
    And el total de la sección coincide con "Gastos del Mes"

  Scenario: Desglose del Mes distingue tipo_origen
    Given gastos del mes creados por distintos orígenes (unico, recurrente, compra, debito)
    When visita el dashboard
    Then "Desglose del Mes" refleja la proporción real por origen

  Scenario: Gastos Recientes muestra los últimos N en orden descendente por fecha
    Given más de N gastos registrados
    When visita el dashboard
    Then "Gastos Recientes" muestra exactamente los N más nuevos, ordenados por fecha descendente

  Scenario: Sección Proyección en el dashboard coincide con /proyeccion
    Given gastos recurrentes, débitos activos y compras en cuotas pendientes
    When visita el dashboard
    Then la sección "Proyección" muestra el mismo primer mes que GET /proyeccion?meses=1
```

**Capa sugerida:** unidad para el cálculo de cada sección si el frontend lo
calcula client-side (revisar si `page.tsx` calcula o solo renderiza lo que
manda el backend — definir esto es el primer paso de implementación, ver
"Antes de implementar" más abajo); UI E2E solo para 1-2 escenarios
representativos por sección, no los 8 completos en cada corrida.

### Dashboard: personalización (`CF-CONF-003`)

```gherkin
Feature: Personalizar secciones visibles del dashboard

  Scenario: Ocultar una sección la saca del dashboard
    Given el usuario ve las 8 secciones por defecto
    When deshabilita "Proyección" desde preferencias
    Then el dashboard ya no muestra la sección "Proyección"

  Scenario: La preferencia persiste tras recargar
    Given el usuario deshabilitó "Tasa de Ahorro"
    When recarga la página
    Then "Tasa de Ahorro" sigue oculta

  Scenario: Reactivar una sección la vuelve a mostrar
    Given una sección deshabilitada previamente
    When la reactiva desde preferencias
    Then el dashboard la muestra de nuevo, con datos actualizados (no cacheados stale)
```

**Capa sugerida:** UI E2E (es una feature de UI+persistencia, no hay lógica de
negocio compleja) + API para el contrato de `PUT /preferencias`.

### Dashboard: salud financiera (`CF-ANL-002`)

El backend (`SaludFinancieraService`) es una función pura y determinística —
buen candidato para tests de unidad/API exhaustivos, con la UI cubriendo solo
un caso representativo.

```gherkin
Feature: Puntaje de salud financiera

  Scenario: Sin gastos en el período retorna score neutral
    Given un usuario sin gastos en el período solicitado
    When consulta GET /salud-financiera?periodo=mes
    Then el score es 50, calificación "Regular", y sugiere registrar gastos

  Scenario: 100% de gastos esenciales maximiza el factor ratio_esenciales
    Given todos los gastos del período son importancia "Necesario"
    When consulta la salud financiera
    Then ratio_esenciales.puntos es igual a su peso completo (40)

  Scenario: Gastos "Prescindible" penalizan el score
    Given gastos con más del 10% del total en importancia "Prescindible"
    When consulta la salud financiera
    Then gastos_evitables.puntos es menor a la mitad de su peso (30)

  Scenario: Sin datos del mes anterior da tendencia neutral
    Given gastos en el mes actual pero ninguno en el mes anterior
    When consulta la salud financiera
    Then tendencia.puntos es la mitad de su peso (10) y la descripción lo indica

  Scenario: Gastos concentrados en una categoría penalizan diversificación
    Given más del 70% del gasto del período en una sola categoría
    When consulta la salud financiera
    Then diversificacion.puntos refleja concentración alta (por debajo de 40% de su peso)

  Scenario: Cambiar de período recalcula todo
    Given datos distintos en la semana vs. el mes actual
    When cambia el filtro de "mes" a "semana"
    Then el score, desglose y recomendaciones cambian de forma consistente con los gastos de esa semana
```

**Capa sugerida:** unidad (backend, ya que `SaludFinancieraService` son
métodos estáticos puros — deberían tener tests de unidad en el repo del API,
no solo E2E) + API para 2-3 escenarios de frontera + 1 UI E2E representativo
(`/salud-financiera` renderiza el score y las recomendaciones).

### Dashboard: proyecciones (`CF-ANL-001`)

```gherkin
Feature: Proyección de gastos futuros

  Scenario: Proyecta cuotas pendientes de una compra
    Given una compra en cuotas con cuotas pendientes
    When consulta GET /proyeccion?meses=3
    Then cada mes proyectado incluye la cuota correspondiente con su monto

  Scenario: Proyecta gastos recurrentes activos, no los inactivos
    Given un gasto recurrente activo y otro inactivo, misma frecuencia
    When consulta la proyección
    Then solo el activo aparece en los meses proyectados

  Scenario: Compra después del cierre paga un ciclo después (consistencia con creditCardDueDate)
    Given una compra con tarjeta de crédito hecha después de dia_mes_cierre
    When consulta la proyección
    Then la primera cuota proyectada cae un mes después de lo que caería si hubiera sido antes del cierre
    # Mismo cálculo que ya se verifica en scheduled-generation.destructive.spec.ts
    # (CF-SCH-GEN-006/008) vía creditCardDueDate() en scheduledGeneration.ts —
    # reusar ese helper en vez de reimplementar la fórmula.

  Scenario: meses fuera de rango (1-12) es rechazado
    When consulta GET /proyeccion?meses=13
    Then responde 400 (Joi: proyeccionFiltersSchema.meses.max(12))
```

**Capa sugerida:** unidad/integración en el backend (es la recomendación que
ya da `coverage-matrix.md`); API para el contrato y el caso de tarjeta de
crédito (reusando `creditCardDueDate()`); 1 UI E2E representativo en
`/proyecciones`.

### Historial: filtros restantes (extensión de `CF-EXP-005`)

```gherkin
Feature: Filtrar el historial de gastos

  Scenario: Filtrar por tipo de origen
    Given gastos de distintos orígenes (unico, recurrente, compra, debito)
    When filtra por tipo_origen "compra"
    Then solo se listan gastos con tipo_origen "compra"

  Scenario: Filtrar por importancia
    Given gastos con distintas importancias
    When selecciona el toggle de importancia "Prescindible"
    Then solo se listan gastos de esa importancia

  Scenario: Buscar por texto coincide con la descripción
    Given un gasto con descripción conocida
    When busca un término presente solo en esa descripción
    Then solo ese gasto aparece en los resultados

  Scenario: Combinar múltiples filtros aplica AND, no OR
    Given gastos que cumplen categoría X pero no importancia Y, y viceversa
    When filtra por categoría X e importancia Y simultáneamente
    Then solo aparecen los gastos que cumplen ambos filtros

  Scenario: Limpiar filtros restaura la lista completa
    Given varios filtros activos
    When hace clic en "Limpiar filtros"
    Then vuelve a verse la lista sin filtrar y el contador de filtros activos vuelve a 0
```

**Capa sugerida:** UI E2E (es lógica 100% client-side sobre datos ya
cargados — `GastosHistorial.tsx` filtra en memoria, no vía query params al
backend, ver líneas 149-168 del componente). No tiene sentido testear esto a
nivel API porque el filtrado no vive ahí.

### Historial: deep-linking por URL (parte de `CF-EXP-005`)

```gherkin
Feature: Filtros precargados desde la URL

  Scenario: Navegar con query params abre los filtros ya aplicados
    When navega a /gastos?cat=<id>&from=<fecha>&to=<fecha>&imp=<id>
    Then el historial muestra los filtros ya activos
    And el panel de filtros está expandido por defecto (hasActiveFilters)

  Scenario: Un link desde otra sección (ej. "Gastos por Categoría" del dashboard) llega filtrado
    Given la sección "Gastos por Categoría" del dashboard linkea al historial
    When hace clic en una categoría del dashboard
    Then llega al historial ya filtrado por esa categoría
```

**Capa sugerida:** UI E2E. El segundo escenario depende de que el dashboard
efectivamente linkee (a confirmar leyendo `page.tsx` antes de implementar —
no confirmado en este relevamiento).

### Historial: agrupación y paginación

```gherkin
Feature: Agrupar y paginar el historial

  Scenario: Agrupar por fecha muestra subtotales por día
    Given gastos en al menos 3 fechas distintas
    When selecciona agrupar por "fecha"
    Then cada grupo muestra su subtotal, y la suma de subtotales coincide con el total filtrado

  Scenario: Agrupar por categoría ordena por subtotal descendente
    Given gastos en al menos 3 categorías
    When selecciona agrupar por "categoría"
    Then los grupos aparecen ordenados por subtotal descendente

  Scenario: Paginación no pierde ni duplica registros
    Given más gastos que el tamaño de página
    When navega a la página 2
    Then los registros de la página 2 son distintos a los de la página 1
    And cambiar de página no reinicia los filtros activos

  Scenario: Cambiar un filtro reinicia la paginación a la página 1
    Given el usuario está en la página 2 con un filtro activo
    When cambia el filtro
    Then vuelve a la página 1 automáticamente
```

**Capa sugerida:** UI E2E, mismo motivo que los filtros (lógica client-side).

### Historial: editar y eliminar desde la UI (`CF-EXP-003`, `CF-EXP-004`)

```gherkin
Feature: Editar y eliminar gastos desde el historial

  Scenario: Editar un gasto único desde el historial actualiza la fila
    Given un gasto único visible en el historial
    When lo edita y cambia el monto
    Then la fila muestra el nuevo monto sin necesidad de recargar
    And el dashboard refleja el cambio tras recargar

  Scenario: Eliminar un gasto pide confirmación
    Given un gasto visible en el historial
    When hace clic en eliminar
    Then aparece un diálogo de confirmación con el texto esperado
    And cancelar no elimina el gasto

  Scenario: Confirmar eliminación lo saca del historial y del dashboard
    Given un gasto visible en el historial
    When confirma la eliminación
    Then el gasto ya no aparece en el historial
    And el total del dashboard baja en ese monto tras recargar
```

**Nota:** `CF-EXP-003` (editar) ya está cubierto a nivel API
(`tests/api/gastos-unicos.destructive.spec.ts`) — este tramo agrega
específicamente el flujo de UI, que hoy no existe. `CF-EXP-004` (eliminar) se
ejercita indirectamente como cleanup en varios tests, pero nunca se verificó
como comportamiento propio (diálogo de confirmación, cancelar sin efecto).

**Capa sugerida:** UI E2E.

### Historial: exportar (`CF-EXP-006`)

```gherkin
Feature: Exportar el historial filtrado

  Scenario: El CSV exportado contiene solo los registros visibles
    Given un filtro activo que reduce la lista a un subconjunto conocido
    When exporta
    Then el CSV descargado contiene exactamente esos registros, ni más ni menos

  Scenario: El CSV conserva encabezados y formato de fecha/monto legible
    When exporta cualquier conjunto de gastos
    Then el CSV tiene encabezados de columna
    And las fechas y montos son parseables sin ambigüedad
```

**Capa sugerida:** UI E2E (Playwright puede interceptar la descarga con
`page.waitForEvent('download')`) + 1 test de unidad si la generación del CSV
es una función pura extraíble del componente.

## Antes de implementar

1. **Confirmar dónde vive el cálculo de cada sección del dashboard** (cliente
   vs. servidor). Si `page.tsx` arma los números client-side a partir de
   varios hooks (`useAllGastos`, `useBalanceEvolucion`, etc.) en vez de pedirle
   un resumen ya calculado al backend, cada escenario de "secciones
   configurables" es candidato a test de unidad de frontend, no solo E2E —
   igual que ya se hace con los filtros del historial.
2. **Confirmar si el dashboard linkea a un historial pre-filtrado** (afecta el
   segundo escenario de deep-linking).
3. Reusar `creditCardDueDate()` (`src/utils/scheduledGeneration.ts`) para
   cualquier escenario de proyección con tarjeta de crédito — no reimplementar
   la fórmula de cierre/vencimiento una segunda vez.
4. `SaludFinancieraService` y `ProyeccionService` son buenos candidatos para
   tests de **unidad en el repo del backend** (son funciones estáticas puras
   con inputs/outputs claros) — vale la pena proponerlo ahí antes de intentar
   cubrir cada rama de puntaje solo desde E2E, que sería lento y frágil para
   ese nivel de detalle aritmético.

## Priorización sugerida

Siguiendo el criterio de `coverage-matrix.md` (P1 = camino crítico con
regla de negocio, P2 = funcionalidad secundaria o exploratoria):

1. **Primero:** Historial — filtros restantes, agrupación/paginación, editar
   desde UI (extienden `CF-EXP-003`/`CF-EXP-005`, ya P1, y son lógica
   client-side aislada — bajo costo, feedback rápido).
2. **Segundo:** Dashboard — secciones configurables + personalización
   (`CF-CONF-003`, P2 pero alto valor de detección de regresiones visuales).
3. **Tercero:** Salud financiera y proyecciones (`CF-ANL-001`/`002`, P2) —
   requieren más preparación de datos (varios meses, varias categorías) y se
   benefician más de tests de unidad en el backend antes que de E2E.
4. **Último:** Exportar CSV (`CF-EXP-006`) — funcionalidad aislada, bajo
   riesgo si algo más se rompe primero.
