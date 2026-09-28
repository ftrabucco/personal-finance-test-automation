# Revisión de Producto/UX — 2026-09-28

Revisión manual, de punta a punta, de Personal Finance App como la usaría un usuario real. No es un code review ni un pase de QA/correctness (eso se cubre en otro lado): es una mirada de producto sobre qué se siente confuso, inconsistente, incompleto o directamente roto al usar la app.

**Cómo se hizo:** backend (`personal-finance-api-nodeJS`, puerto 3030) y frontend (`personal-finance-frontend`, puerto 3001) corriendo en local contra la base de datos de desarrollo. Se usó el usuario de test `francisco@gmail.com` (credenciales de `personal-finance-test-automation/.env`). Como el dataset inicial era casi vacío en varias secciones (0 compras, 0 ingresos, 0 cuentas bancarias), se cargó un dataset chico y realista vía API antes de navegar: 1 cuenta bancaria, 2 ingresos únicos, 1 ingreso recurrente, 1 compra en 12 cuotas (con tarjeta de crédito), sobre la data ya existente (12 gastos, 1 gasto recurrente, 1 débito automático, 13 tarjetas). La navegación se hizo con un script Playwright ad-hoc (no es un test del framework, se descartó al terminar) que loguea, visita cada sección, interactúa con formularios/filtros/altas/bajas, y saca capturas full-page. Las capturas quedaron en `personal-finance-test-automation/test-results/product-review-screenshots/` (gitignored) y se referencian acá por nombre de archivo para trazabilidad.

---

## 1. Resumen

La app cubre con solidez el circuito núcleo de "cargar un gasto/ingreso único y verlo en el historial": el formulario de alta, la validación, el borrado con confirmación y los filtros funcionan bien y son consistentes entre Gastos e Ingresos. Sin embargo, la primera impresión real de un usuario nuevo es la de una app bastante más chica de lo que es: gran parte de la funcionalidad (tarjetas, cuentas bancarias, gastos recurrentes, débitos automáticos, compras en cuotas, salud financiera, proyecciones) está oculta del menú lateral por defecto detrás de un sistema de "módulos opcionales" enterrado en Configuración, sin ningún aviso visible salvo un banner que aparece de forma inconsistente. A esto se suma un bug confirmado: el Dashboard sirve datos en caché por hasta 5 minutos sin ningún indicio visual de que están desactualizados, cada vez que los gastos cambian por un canal que no sea una acción del propio usuario en esa pestaña (el scheduler de generación automática del backend, otra pestaña, otra sesión) — solo un reload manual lo corrige (ver B1 para la causa raíz exacta, confirmada en código). Por último, se confirmó que aunque el backend soporta completamente gastos recurrentes, débitos automáticos y compras en cuotas (se pudieron crear por API sin problemas), el frontend actual no tiene ninguna pantalla para darlos de alta, editarlos o siquiera listarlos como entidades — son invisibles para un usuario que solo use la interfaz.

---

## 2. Fricciones de UX

**F1 — Dashboard desactualizado sin avisar cuando los datos cambian fuera de esa pestaña**
Sección: Dashboard (`/`). Ver B1 en "Posibles bugs" para la reproducción exacta y la causa raíz confirmada (staleTime de 5 minutos en React Query, sin invalidación para cambios que no vienen de una mutación del propio frontend). El impacto de UX es real independientemente del mecanismo: un usuario que deja el dashboard abierto mientras el scheduler genera un débito automático o una cuota no va a ver el cambio reflejado, sin ningún indicador de que la vista está desactualizada. Nota: las capturas `01-dashboard.png` / `debug-dash-A-immediately.png` de la primera pasada de esta revisión mostraban ceros, pero eso fue un artefacto de caché de la sesión de prueba (datos cargados por API mientras el dashboard ya estaba en memoria), no algo que ocurra en un login limpio — confirmado no reproducible en un login sin caché previa.

**F2 — La mayoría de las funciones están ocultas y no hay ninguna pista de que existen**
Sección: navegación general / Configuración > Módulos. El sidebar de este usuario (con datos reales de tarjetas, cuentas, recurrentes, etc.) solo muestra: Dashboard, Gastos, Ingresos, Configuración, Perfil. No aparecen Tarjetas, Cuentas Bancarias, Salud Financiera ni Proyecciones — a pesar de que el usuario ya tiene 13 tarjetas y 1 cuenta bancaria cargadas. La razón: existe un sistema de "Módulos Opcionales" en Configuración > Módulos donde estas funciones están todas con el toggle en apagado (`20-configuracion-modulos.png`). Nada en el resto de la interfaz explica esto la primera vez — no hay onboarding, tour ni tooltip. Recién en el Dashboard aparece a veces un banner "Personalizá tu experiencia... podés activar funciones avanzadas... desde Configuración" (ver Inconsistencia I1 sobre por qué "a veces"). Un usuario nuevo razonablemente concluiría que la app no tiene tarjetas de crédito, cuotas ni proyecciones. Sugerencia: si el usuario ya tiene datos de un módulo (tarjetas, cuentas, etc. — algo que solo puede pasar si en algún momento estuvo activado o se cargó por otra vía), no debería estar desactivado por default; y como mínimo, el link a "Módulos" debería estar visible permanentemente en el sidebar o en un menú de "más secciones", no solo en un banner dismisseable del dashboard.

**F3 — No hay forma de crear/gestionar gastos recurrentes, débitos automáticos ni compras en cuotas desde la UI**
Sección: Gastos (`/gastos-recurrentes`, `/debitos-automaticos`, `/compras`). Estas tres rutas, si se navega directo a ellas, renderizan exactamente la misma pantalla que `/gastos` (tab "Historial") — no hay tabs, formularios ni vistas propias para estos tipos (comparar `10-gastos.png`, `10-compras.png`, `10-gastos-recurrentes.png`, `10-debitos-automaticos.png`: son pixel-idénticas). El modal "Nuevo Gasto" (`30-nuevo-gasto-modal.png`) solo tiene campos para un "Gasto Único" — no hay selector de tipo. Se confirmó por API que el backend soporta perfectamente crear una compra en 12 cuotas con tarjeta, generando las cuotas correspondientes — pero una vez creada, en la UI sólo es visible como líneas sueltas "Notebook Lenovo ThinkPad - Cuota 2/12" en el historial de Gastos; no hay ninguna pantalla donde ver "la compra" como entidad (monto total, cuotas pagadas/restantes, tarjeta asociada) ni forma de crear una nueva compra, gasto recurrente o débito automático sin usar la API directamente. Esto es la brecha de funcionalidad más grande encontrada en la revisión — ver más detalle en la sección 4.

**F4 — Mensajes de validación mezclan español con inglés nativo del navegador**
Sección: modal "Nuevo Gasto" > campo Monto. Al ingresar un monto negativo (-500) aparecen simultáneamente dos mensajes de error para el mismo campo: uno en español debajo del input ("El monto debe ser mayo[r a 0]", texto rojo) y un tooltip nativo del navegador en inglés ("Value must be greater than or equal to 0."). Ver `32-nuevo-gasto-validation-negative.png`. Además de la inconsistencia de idioma, es redundante mostrar dos validaciones para el mismo error. Sugerencia: usar `noValidate` en el formulario y confiar únicamente en la validación custom en español (que ya está bien escrita y bien ubicada).

**F5 — El badge de cotización del dólar no comunica que es interactivo**
Sección: header, visible en toda la app (`$ USD $1.550`). Es un pill/badge con apariencia de indicador estático, pero al hacer click dispara una actualización del tipo de cambio contra una API externa y muestra un toast ("Tipo de cambio actualizado — Fuente: api_dolar_api - $1565", ver `52-currency-toggle.png`). No hay ningún ícono de refresh, cursor pointer evidente en las capturas, ni texto que sugiera "click para actualizar". Un usuario no tiene forma de saber que ese elemento hace algo.

**F6 — El filtro de fecha por defecto ("Este mes") esconde datos recién creados fuera del mes actual sin avisar por qué la lista está vacía**
Sección: Gastos Únicos e Ingresos Únicos. Al crear (por API, simulando datos históricos) un ingreso único fechado en julio o agosto, la pestaña "Únicos" con el filtro por defecto "Este mes" muestra "No hay ingresos registrados. Creá tu primer ingreso único." — un mensaje de estado vacío que sugiere que no hay *ningún* dato, cuando en realidad sí hay, solo que están fuera del rango de fecha activo. Ver `10-ingresos-unicos.png`. Sugerencia: cuando el filtro de fecha activo no es "Todo" y la razón de la lista vacía es el filtro (no la ausencia real de datos), el estado vacío debería decirlo explícitamente (ej. "No hay ingresos este mes — tenés 2 en otros períodos, probá 'Todo'") en vez de invitar a crear un dato que ya existe.

---

## 3. Inconsistencias

**I1 — El banner "Personalizá tu experiencia" aparece o no aparece según de dónde vengas, no según una regla clara**
En la primera carga del Dashboard tras el login no aparece (`01-dashboard.png`, `debug-dash-A-immediately.png`). Navegando a otra sección y volviendo al Dashboard, o haciendo un reload, sí aparece (`90-mobile-dashboard.png`, `debug-dash-C-after-reload.png`). Está atado al mismo problema de carga inicial que F1/el bug de la sección 5, pero vale remarcarlo como inconsistencia: el único mecanismo de descubrimiento de los módulos ocultos (F2) es un elemento que ni siquiera se muestra siempre.

**I2 — Formato de fecha inconsistente entre pantallas**
El listado de Gastos/Ingresos usa `DD/MM` dentro de un agrupador por rango ("HOY", "ESTE MES") y `DD/MM/YYYY` en la tabla de detalle de Gastos Únicos (`36-after-create.png`: "28/09/2026"). El selector de fecha del formulario de alta, en cambio, usa el `<input type="date">` nativo del navegador, que se renderiza como `MM/DD/YYYY` (formato estadounidense — ver `30-nuevo-gasto-modal.png`, campo Fecha: "09/28/2026"). Para un usuario argentino acostumbrado a DD/MM/YYYY en todos lados, tener el selector de alta en formato inverso es una fuente de errores de carga silenciosos (cargar el 3 de abril como si fuera el 4 de marzo, por ejemplo).

**I3 — Terminología de tabs "Únicos" vs. "Historial" no es simétrica entre Gastos e Ingresos, pero el resto de tabs prometidos no existen en ninguno de los dos**
Tanto Gastos como Ingresos tienen exactamente las mismas dos tabs (Historial / Únicos), lo cual en sí es consistente. Pero la nomenclatura interna del sistema (endpoints `gastos-recurrentes`, `debitos-automaticos`, `compras`, `ingresos-recurrentes`) sugiere que se pensó una estructura con más tabs, que no llegó a construirse — actualmente sólo sobrevive como rutas "fantasma" que renderizan el mismo contenido que `/gastos` o `/ingresos` (ver F3).

**I4 — Confirmación de borrado: sólida y consistente donde existe, pero no se puede evaluar en todas las secciones**
El modal de confirmación de borrado de Gastos Únicos (`38-delete-confirm.png`: "¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer", con botón "Eliminar" en rojo) es claro y está bien resuelto. No se pudo comparar contra el flujo de borrado de Tarjetas o Cuentas Bancarias en esta pasada por límite de tiempo, pero dado que esas pantallas usan la misma librería de componentes, es razonable esperar que sea igual de bueno — vale confirmarlo en una revisión de seguimiento.

**I5 — "Todos los tipos" en el panel de Filtros de Gastos sugiere una taxonomía de tipos que la UI de alta no expone**
El panel de Filtros de Gastos (`51-filtros-panel.png`) tiene un selector "Todos los tipos" — evidencia adicional de que el modelo de datos distingue tipos de gasto (único/recurrente/débito/compra), pero, como se detalla en F3, no hay forma de crear un gasto de esos tipos desde la UI, sólo de (presumiblemente) filtrar por ellos si ya existen (generados por script/API, como el caso de prueba de esta revisión).

---

## 4. Funcionalidad incompleta o con potencial

**Gastos Recurrentes, Débitos Automáticos y Compras en Cuotas: el backend los soporta enteramente, la UI no expone nada.** Es la brecha más grande de la revisión. El backend tiene endpoints completos de alta/baja/modificación para los tres (`POST/PUT/DELETE /gastos-recurrentes`, `/debitos-automaticos`, `/compras`), con generación automática de gastos futuros, lógica de fecha de cierre/vencimiento de tarjeta, etc. — funcionalidad claramente compleja y ya construida. Pero no hay ningún botón, tab ni formulario en el frontend para: (a) dar de alta un gasto recurrente nuevo (alquiler, suscripción con monto fijo mensual), (b) dar de alta un débito automático, (c) dar de alta una compra en cuotas con tarjeta, ni (d) ver el listado de compras/recurrentes/débitos activos con su estado (cuántas cuotas pagadas, próxima fecha de generación, activo/inactivo). Esto tira por la borda una porción enorme del valor diferencial de la app (manejo de tarjetas de crédito argentinas, cuotas, débitos automáticos) frente a un anotador de gastos genérico. Sugerencia concreta: como mínimo, extender el modal "Nuevo Gasto" con un selector de tipo (Único / Recurrente / Débito Automático / Compra en Cuotas) que muestre los campos correspondientes (día de pago, frecuencia, cantidad de cuotas, tarjeta), y agregar las tabs correspondientes en `/gastos` para listarlos y editarlos.

**Botón "Generar Gastos" en Gastos > Historial: no se explica qué hace ni cuándo hace falta usarlo.** Aparece junto a "Nuevo Gasto" en la tab Historial (`10-gastos.png`) pero no tiene tooltip ni texto de ayuda. Por el nombre del endpoint asociado (`/gastos/generate`) y lo visto en `automation-backlog.md`, dispara la generación de gastos pendientes desde recurrentes/débitos/compras — una acción de sistema, no algo que un usuario debería tener que disparar manualmente sin entender qué hace. Si el scheduler de backend ya corre esto automáticamente (hay un cron mencionado en los logs del servidor: "Intelligent Expense Scheduler"), este botón parece un control de debug expuesto sin querer en producción. Si es intencional (por ejemplo, para forzar la generación del mes actual), necesita un texto explicativo.

**Salud Financiera y Proyecciones están sorprendentemente completos y bien pensados, pero enterrados.** `10-salud-financiera.png` tiene un score (45/100, "Regular"), ratio de cobertura, desglose de gastos necesarios vs. evitables — es una feature con potencial real de diferenciación. `10-proyecciones.png` tiene un gráfico de barras a 6 meses con ingresos/gastos/balance proyectado, con tooltip por mes. Ambas están sólidas funcionalmente. El problema no es la feature, es que está detrás del mismo muro de "módulo desactivado por default" de F2 — literalmente la mejor parte de la app es la más difícil de encontrar.

**Cuentas Bancarias: solo sirve como catálogo para asociar a débitos automáticos, no tiene vida propia.** El texto de la propia pantalla lo dice ("Gestiona las cuentas bancarias para tus débitos automáticos", `10-cuentas-bancarias.png`). No hay saldo, no hay movimientos, no hay ningún dato más allá de nombre/banco/tipo/moneda. Es coherente con el alcance actual (no es un agregador bancario), pero si en algún momento se plantea sumar valor ahí, lo obvio sería un saldo manual editable por el usuario (tipo "balance inicial" que ya existe a nivel Configuración > General, pero por cuenta) para poder ver evolución de saldo por cuenta, no sólo el balance global acumulado del Dashboard.

**Exportar CSV existe en Gastos e Ingresos pero no se pudo verificar su contenido en esta pasada.** El botón está presente y visible (`10-gastos.png`, `10-ingresos.png`) — vale una revisión de seguimiento centrada en qué exporta exactamente (¿respeta los filtros activos? ¿incluye conversión a USD?).

---

## 5. Posibles bugs

**B1 (nuevo, alta severidad) — El Dashboard sirve datos en caché desactualizados por hasta 5 minutos, sin ningún indicio visual, cada vez que los datos cambian por fuera de esa misma pestaña.**

**Corrección tras una segunda pasada de investigación (2026-09-28):** la reproducción original de esta revisión decía "el dashboard muestra ceros inmediatamente después del login". Eso resultó ser impreciso — se investigó más a fondo con un script instrumentado (login real + logs de network/consola) y **un login limpio, sin caché previa, no reproduce el problema**: a los 0.3s de loguearse el dashboard ya mostraba el monto correcto. El bug real es otro, más específico y más importante:

Reproducción exacta (confirmada):
1. Login normal, dashboard carga correctamente con los totales reales (ej. "Gastos del Mes: $100.000,00").
2. Sin recargar la página, se crea un gasto nuevo llamando **directamente a la API** (mismo mecanismo que usa cualquier seed de test, el scheduler de generación automática del backend, u otra pestaña/dispositivo con la misma cuenta).
3. Se espera 2 segundos sin recargar: el dashboard sigue mostrando el total viejo, sin el gasto nuevo.
4. Se hace `reload()` de la misma URL: recién ahí aparece el total correcto actualizado.

**Causa raíz confirmada en código:** `src/lib/api/queryClient.ts` define `staleTime: 1000 * 60 * 5` (5 minutos) como default global para todas las queries de React Query, y ninguna de las queries que alimentan el dashboard (`useAllGastos`, `useSaludFinanciera`, `useProyeccion`, `useBalanceEvolucion`, etc.) se invalida cuando los datos cambian por un canal que no sea una mutación disparada desde la propia UI. Se confirmó que las mutaciones que sí pasan por el frontend están bien resueltas — el botón "Procesar Pendientes" invalida `['gastos']`, `['compras']`, `['gastos-recurrentes']`, `['debitos-automaticos']` correctamente (`useProcesamiento.ts:69-72`). El gap es específicamente: nada refresca el dashboard cuando el cambio se origina afuera de esa pestaña (el scheduler de generación automática corriendo en background, otra pestaña, otra sesión del mismo usuario).

Impacto práctico: en un uso real, cualquier gasto generado automáticamente por el scheduler mientras el usuario tiene el dashboard abierto (débitos automáticos, cuotas, recurrentes) no se reflejará hasta que pase el `staleTime` de 5 minutos o el usuario recargue manualmente — sin ningún indicador de que la vista está desactualizada.

Sugerencia concreta: invalidar (o al menos refetchear) las queries del dashboard cuando la pestaña recupera el foco (hoy `refetchOnWindowFocus: false` está deshabilitado globalmente) o al navegar de vuelta al dashboard; alternativamente, bajar el `staleTime` específicamente para las queries que alimenta el dashboard, ya que 5 minutos es agresivo para datos que el usuario espera ver "en vivo".

**B2 (nuevo, severidad media) — Validación de "fecha no puede ser futura" en compras rechaza una fecha claramente pasada.**
Encontrado durante la carga de datos de prueba por API (no reproducible por UI porque no existe formulario de compras — ver F3). Con la fecha del sistema en 2026-09-28, `POST /api/compras` con `fecha_compra: "2026-08-05"` fue rechazado con `"La fecha no puede ser futura"`, a pesar de que el 5 de agosto de 2026 es claramente anterior al 28 de septiembre de 2026. El mismo payload con `fecha_compra: "2026-07-05"` fue aceptado sin problema. Esto es consistente con la clase de bug de timezone (`moment(...).tz(zone)` vs `moment.tz({...}, zone)`) ya documentada y corregida en otros puntos del sistema según `automation-backlog.md` (PRs #38 y #41) — probablemente una instancia nueva del mismo patrón, esta vez en la validación o generación de cuotas de `compra.controller.js`/`CompraService`. Vale una revisión específica del cálculo de fechas límite en compras.

**B3 (nuevo, severidad baja/cosmética) — Posible corrimiento de un día al guardar `fecha_compra`.**
En la misma sesión de carga de datos: se envió `fecha_compra: "2026-07-05"` y la respuesta de la API devolvió `"fecha_compra": "2026-07-04"` — un día antes de lo enviado. Es una observación puntual (un solo caso, encontrado vía API, no verificado exhaustivamente ni contrastado con distintas horas del día), pero por las dudas de que sea la misma familia de bug de timezone que B2, vale que quien lo investigue mire ambos juntos.

**B4 (ya conocido, no nuevo) — Filtro de moneda pendiente de fix de backend.**
`automation-backlog.md` ya documenta `BUG-2026-005` (filtro de moneda en Gastos e Ingresos pendiente de fix de backend). No se re-verificó en esta pasada por estar fuera del alcance de una revisión de producto, pero se menciona para que quede claro que no es un hallazgo nuevo.

**Observación sin confirmar — Tarjetas duplicadas.**
La pantalla de Tarjetas (`10-tarjetas.png`) muestra 13 tarjetas para el usuario de test, con juegos de 3 tarjetas idénticas (mismo nombre/banco/condiciones) para "Crédito Mastercard BBVA", "Crédito Visa Galicia" y "Débito Galicia". Esto es muy probablemente data residual de corridas previas de tests automatizados contra esta misma base de datos local (no algo creado en esta revisión), y no hay validación de unicidad de tarjeta a nivel de negocio (lo cual podría ser intencional, ya que dos tarjetas físicas distintas pueden compartir nombre/banco). Se deja constancia porque, si se decide, sería fácil de limpiar (`DELETE /api/tarjetas/:id`) sin afectar la revisión.

---

## 6. Quick wins vs. cambios grandes

**Quick wins (bajo esfuerzo, alto impacto):**
- Invalidar/refetchear las queries del dashboard al volver a la pestaña o navegar de vuelta a `/`, o bajar el `staleTime` de 5 minutos para esas queries específicas (B1) — hoy cualquier cambio que no venga de una acción del propio usuario en esa pestaña (scheduler de generación automática, otra sesión) queda invisible hasta un reload manual.
- Sacar la validación nativa del navegador del formulario de "Nuevo Gasto" (`noValidate`) para no duplicar mensajes en dos idiomas (F4).
- Agregar un ícono de refresh visible o un tooltip al badge de cotización para que se entienda que es clickeable (F5).
- Cambiar el mensaje de estado vacío en listados filtrados por fecha para distinguir "no hay datos" de "no hay datos en este rango" (F6).
- Agregar texto de ayuda o un tooltip al botón "Generar Gastos" explicando qué hace.
- Revisar el cálculo de fecha límite en la validación de compras (B2) — probablemente el mismo fix de timezone ya aplicado en otros módulos.

**Cambios grandes (necesitan diseño/scoping):**
- Repensar el sistema de módulos opcionales: decidir si deberían venir activados por default (al menos los que ya tienen datos cargados), y/o darles más visibilidad que un banner dismisseable (F2). Esto tiene impacto directo en cuánta funcionalidad "descubre" un usuario nuevo.
- Diseñar y construir la UI de alta/gestión de Gastos Recurrentes, Débitos Automáticos y Compras en Cuotas (F3) — es el trabajo más grande de esta lista, pero también el de mayor valor: el backend ya está listo, así que es prácticamente todo trabajo de frontend.
- Unificar el formato de fecha en toda la app a DD/MM/YYYY, incluyendo el input nativo de fecha del formulario de alta (I2) — probablemente requiere reemplazar el `<input type="date">` nativo por un date picker propio.
- Si se decide invertir en Cuentas Bancarias como sección con valor propio (no solo catálogo de soporte), diseñar qué información adicional mostrar por cuenta (saldo, evolución).

---

## Índice de capturas relevantes

| Archivo | Contenido |
|---|---|
| `01-dashboard.png`, `debug-dash-A-immediately.png` | Estado en cero visto en la primera pasada — luego identificado como artefacto de caché de esa sesión de prueba, no reproducible en login limpio (ver B1) |
| `debug-dash-C-after-reload.png` | Dashboard correcto tras reload (B1) |
| `10-gastos.png` / `10-compras.png` / `10-gastos-recurrentes.png` / `10-debitos-automaticos.png` | Las 4 rutas renderizan lo mismo (F3) |
| `20-configuracion-modulos.png` | Módulos opcionales todos desactivados por default (F2) |
| `30-nuevo-gasto-modal.png` | Modal de alta, sin selector de tipo |
| `32-nuevo-gasto-validation-negative.png` | Doble mensaje de validación ES/EN (F4) |
| `38-delete-confirm.png` | Confirmación de borrado (I4) |
| `10-salud-financiera.png`, `10-proyecciones.png` | Features completas pero ocultas |
| `90-mobile-dashboard.png`, `50-mobile-nuevo-gasto-modal.png` | Vista mobile del dashboard y del formulario de alta |
