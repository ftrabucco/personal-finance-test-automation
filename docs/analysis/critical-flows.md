# Flujos criticos

## 1. Objetivo

Identificar los recorridos que sostienen el valor principal del producto y
clasificarlos por impacto, riesgo y prioridad.

Este documento no es todavia un catalogo exhaustivo de casos de prueba. Cada
flujo representa un comportamiento de negocio que luego puede requerir varios
escenarios UI, API, integracion o unidad.

## 2. Estado

- Fecha de relevamiento: 2026-06-15.
- Fuente: inventario funcional aprobado e inspeccion estatica de frontend y
  backend.
- Estado: clasificacion inicial completa; pendiente de validacion exploratoria
  ejecutando el sistema.

## 3. Criterios

### 3.1 Prioridad

| Prioridad | Definicion |
| --- | --- |
| P0 | Su falla impide usar el producto para su objetivo principal, compromete seguridad o mezcla datos entre usuarios. |
| P1 | Su falla produce datos financieros incorrectos o bloquea una capacidad central con alternativa limitada. |
| P2 | Su falla afecta una capacidad importante pero aislada, configurable o con alternativa manual. |
| P3 | Su falla afecta conveniencia, compatibilidad, presentacion o variantes de bajo uso. |

La prioridad expresa impacto de negocio. No determina por si sola en que suite
se ejecuta el caso.

### 3.2 Riesgo

El riesgo se estima combinando:

- impacto sobre datos y decisiones financieras;
- probabilidad de regresion;
- complejidad de reglas y dependencias;
- cantidad de modulos afectados;
- dificultad para detectar el error manualmente;
- dependencia de fecha, zona horaria o servicios externos.

### 3.3 Capas

| Capa | Proposito |
| --- | --- |
| UI E2E | Validar que el usuario puede completar el recorrido real |
| API | Validar contratos, autorizacion, persistencia y errores |
| Integracion | Validar servicios, base de datos y colaboracion entre componentes |
| Unidad | Validar reglas puras, calculos y limites |

Un flujo puede y normalmente debe tener cobertura en mas de una capa.

### 3.4 Smoke

Smoke es una seleccion pequena de comprobaciones de salud, no una prioridad
adicional. Un flujo puede ser P0 sin ejecutarse completo en smoke.

Un buen candidato a smoke:

- termina rapidamente;
- es determinista;
- confirma que una capacidad esencial esta disponible;
- genera pocos datos y puede limpiarlos;
- diagnostica una falla con claridad.

## 4. Flujos P0

### CF-AUTH-001 - Iniciar sesion

**Actor:** visitante.

**Resultado esperado:** con credenciales validas obtiene una sesion y accede al
dashboard; con credenciales invalidas permanece fuera del sistema.

**Riesgos principales:**

- acceso imposible para todos los usuarios;
- exposicion de rutas protegidas;
- token o estado local inconsistente;
- bloqueo por rate limit durante automatizacion.

**Cobertura recomendada:** UI E2E, API, integracion y seguridad.

**Smoke:** si, con un usuario preexistente.

### CF-AUTH-002 - Proteger una sesion y aislar datos

**Actor:** visitante o usuario autenticado.

**Resultado esperado:** las rutas y APIs protegidas rechazan sesiones ausentes,
invalidas o expiradas; un usuario no puede leer ni modificar recursos de otro.

**Riesgos principales:**

- fuga o modificacion de informacion financiera;
- referencias directas inseguras por ID;
- diferencias entre proteccion de UI y API.

**Cobertura recomendada:** API e integracion como capas principales; UI E2E para
redireccion y expiracion visible.

**Smoke:** solo la redireccion sin sesion. El aislamiento completo pertenece a
seguridad/regresion.

### CF-EXP-001 - Registrar un gasto unico

**Actor:** usuario autenticado.

**Precondiciones:** existen catalogos requeridos.

**Resultado esperado:** el usuario registra un gasto valido, el origen queda
persistido, se genera inmediatamente un gasto consolidado y aparece en el
historial con importe, fecha, categoria y moneda correctos.

**Riesgos principales:**

- se guarda el origen pero no el gasto consolidado;
- se duplica el gasto;
- conversion monetaria incorrecta;
- el dashboard y el historial no reflejan el alta.

**Cobertura recomendada:** UI E2E, API, integracion y unidad para conversion.

**Smoke:** si, creando y eliminando un dato identificable.

### CF-EXP-002 - Consultar historial y total del periodo

**Actor:** usuario autenticado.

**Resultado esperado:** el historial muestra los gastos del periodo solicitado
y sus totales coinciden con los registros consolidados.

**Riesgos principales:**

- fechas fuera del periodo;
- filtros aplicados solo visualmente;
- errores de suma o moneda;
- diferencias con el dashboard.

**Cobertura recomendada:** UI E2E, API y unidad para agregaciones.

**Smoke:** si, con datos controlados y una comprobacion minima.

### CF-DATA-001 - Mantener consistencia transaccional del gasto

**Actor:** sistema.

**Resultado esperado:** la creacion o procesamiento finaliza completamente o se
revierte; no quedan origenes procesados sin gasto ni gastos duplicados.

**Riesgos principales:**

- datos financieros parciales;
- reintentos no idempotentes;
- fallas entre persistencia y generacion.

**Cobertura recomendada:** integracion y API. UI E2E solo comprueba el resultado
visible de un recorrido exitoso.

**Smoke:** no.

## 5. Flujos P1

### CF-EXP-003 - Editar un gasto unico

El usuario modifica datos permitidos y el cambio se refleja de forma coherente
en el origen, historial, resumenes y consultas relacionadas.

**Capas:** UI E2E, API e integracion.

### CF-EXP-004 - Eliminar un gasto

El usuario confirma la eliminacion y el sistema elimina o desvincula
coherentemente los datos relacionados, actualizando totales.

Debe distinguirse eliminar el origen desde su modulo de eliminar el gasto
consolidado desde historial.

**Capas:** UI E2E, API e integracion.

### CF-EXP-005 - Buscar, filtrar y agrupar gastos

Los resultados y resumenes responden a descripcion, origen, categoria,
importancia y rango de fechas. Los filtros recibidos por URL producen el mismo
resultado que la interaccion manual.

**Capas:** UI E2E y unidad para transformaciones del cliente.

### CF-EXP-006 - Exportar gastos filtrados

El CSV contiene solamente los registros del conjunto visible y conserva
encabezados, importes, fechas y caracteres esperados.

**Capas:** UI E2E y unidad.

### CF-SCH-001 - Generar un gasto recurrente

Una definicion activa genera el gasto correcto en el periodo correspondiente,
respeta frecuencia, inicio, dia y mes de pago, y evita duplicados.

**Riesgo:** alto por fecha, zona horaria y catch-up.

**Capas:** integracion y unidad como principales; API y un recorrido UI E2E.

### CF-SCH-002 - Procesar un debito automatico

Un debito activo genera el gasto correspondiente usando tarjeta o cuenta
bancaria y la regla de fecha configurada.

**Riesgo:** alto hasta confirmar el contrato entre formulario, validacion API y
modelo.

**Capas:** integracion, API, unidad y UI E2E despues de estabilizar el contrato.

### CF-SCH-003 - Procesar cuotas de una compra

Una compra valida genera cada cuota una sola vez, calcula el importe por cuota,
actualiza el progreso y finaliza cuando alcanza la cantidad total.

**Capas:** integracion y unidad como principales; API y UI E2E representativa.

### CF-SCH-004 - Calcular vencimientos de tarjeta

La primera cuota depende de si la compra ocurre antes, durante o despues del
cierre. Las siguientes conservan el ciclo y ajustan dias inexistentes en meses
cortos.

**Capas:** unidad exhaustiva e integracion. UI E2E solo para un ejemplo
representativo.

### CF-SCH-005 - Procesar pendientes y catch-up

El procesamiento manual recupera periodos vencidos permitidos, informa exitos,
omisiones y errores, y puede repetirse sin duplicar gastos.

**Capas:** integracion y API. UI E2E para el boton global y una operacion
individual.

### CF-INC-001 - Registrar un ingreso unico

El usuario registra un ingreso valido y este aparece en historial, resumenes y
calculos financieros con fecha, fuente y moneda correctas.

**Capas:** UI E2E, API e integracion.

### CF-INC-002 - Mantener ingresos recurrentes

Una definicion activa participa correctamente en historial o proyecciones
segun el comportamiento definitivo; una inactiva queda excluida.

**Capas:** API, integracion, unidad y UI E2E.

### CF-DASH-001 - Mantener consistencia del dashboard

Gastos del mes, ingresos, balance, ahorro y balance acumulado coinciden con los
datos fuente y el balance inicial.

**Capas:** UI E2E, API y unidad.

### CF-CUR-001 - Convertir y conservar montos multimoneda

El sistema acepta ARS/USD, calcula ambos importes con la cotizacion correcta y
conserva el snapshot utilizado para que los historicos no cambien
retroactivamente.

**Capas:** unidad, integracion y API. UI E2E para visualizacion y alta.

### CF-REF-001 - Restringir eliminacion de recursos en uso

Tarjetas, cuentas, categorias y fuentes asociadas no se eliminan dejando
referencias invalidas. El usuario recibe un resultado comprensible.

**Capas:** API e integracion; UI E2E para confirmacion y mensaje.

## 6. Flujos P2

### CF-AUTH-003 - Registrar un usuario

Crear una cuenta valida, rechazar datos invalidos y emails duplicados, y
permitir luego iniciar sesion.

**Capas:** API y UI E2E.

El registro se elevara a P0 si es el unico mecanismo real de alta en produccion.

### CF-AUTH-004 - Actualizar perfil y contrasena

Actualizar nombre/email, impedir duplicados y cambiar contrasena verificando la
actual.

**Capas:** API y UI E2E.

### CF-CARD-001 - Administrar tarjetas

Crear, editar, consultar y eliminar tarjetas respetando reglas por tipo,
ultimos digitos, cierre, vencimiento y cuotas.

**Capas:** API y UI E2E.

### CF-ACCOUNT-001 - Administrar cuentas bancarias

Crear, editar, activar y eliminar cuentas respetando tipo, moneda y uso.

**Capas:** API y UI E2E.

### CF-CAT-001 - Administrar categorias

Crear, editar, activar, ordenar y eliminar categorias del usuario sin afectar
datos ajenos ni catalogos del sistema.

**Capas:** API y UI E2E.

### CF-SOURCE-001 - Administrar fuentes de ingreso

Crear, editar, activar, ordenar y eliminar fuentes respetando asociaciones.

**Capas:** API y UI E2E.

### CF-CONF-001 - Configurar modulos

Habilitar o deshabilitar modulos opcionales actualiza sidebar, pestañas y altas
rapidas, persiste tras recarga y no permite desactivar modulos core.

**Capas:** UI E2E y API.

### CF-CONF-002 - Configurar balance inicial

Guardar un valor no negativo, persistirlo y reflejarlo en balance acumulado.

**Capas:** UI E2E, API y unidad.

### CF-CONF-003 - Personalizar dashboard

Ocultar o mostrar secciones permitidas y conservar la preferencia.

**Capas:** UI E2E y API.

### CF-ANL-001 - Consultar proyecciones

La proyeccion para distintos horizontes incorpora gastos programados, cuotas,
ingresos activos, fechas, frecuencias y moneda.

**Capas:** unidad e integracion como principales; UI E2E representativa.

### CF-ANL-002 - Consultar salud financiera

Las metricas del periodo coinciden con gastos, ingresos, categorias e
importancias, y cambian al seleccionar otro periodo.

**Capas:** unidad, API y UI E2E.

### CF-CUR-002 - Actualizar tipo de cambio

Consultar, configurar o actualizar la cotizacion sin hacer que la suite dependa
de la disponibilidad de un proveedor externo.

**Capas:** integracion con proveedor simulado y API.

## 7. Flujos P3

### CF-NAV-001 - Redirigir rutas de compatibilidad

Las URLs antiguas redirigen a la pestaña correcta y conservan `new=true`.

**Capas:** UI E2E.

### CF-UX-001 - Cambiar tema

El usuario alterna tema claro/oscuro y la preferencia se conserva segun el
contrato definitivo.

**Capas:** UI E2E.

### CF-UX-002 - Mantener navegacion responsive

Las capacidades principales son accesibles desde sidebar o navegacion movil y
los formularios pueden completarse en resoluciones soportadas.

**Capas:** UI E2E visual/funcional.

### CF-UX-003 - Mostrar estados de carga, vacio y error

Las pantallas comunican adecuadamente ausencia de datos, carga y fallas de red.

**Capas:** UI E2E con respuestas controladas o component tests.

## 8. Candidatos iniciales a smoke

La primera suite smoke propuesta contiene:

| ID | Comprobacion |
| --- | --- |
| CF-AUTH-001 | Login valido y llegada al dashboard |
| CF-AUTH-002 | Redireccion a login sin sesion |
| CF-EXP-001 | Crear gasto unico y verlo en historial |
| CF-EXP-002 | Cargar historial y total del periodo |
| CF-INC-001 | Crear ingreso unico y verlo en historial |
| CF-DASH-001 | Renderizar indicadores principales con datos consistentes |

Para mantenerla rapida:

- se ejecutara inicialmente en Chromium;
- usara un usuario preexistente;
- preparara catalogos y datos por API;
- limpiara los datos creados;
- no dependera del scheduler ni del proveedor real de tipo de cambio;
- evitara probar todas las validaciones dentro de smoke.

La inclusion de registro publico, procesamiento programado o modulos opcionales
se revisara cuando se confirme su importancia operativa.

## 9. Matriz resumida

| Dominio | Flujo principal | Prioridad | Riesgo | Smoke |
| --- | --- | --- | --- | --- |
| Autenticacion | Login | P0 | Alto | Si |
| Seguridad | Proteccion y aislamiento | P0 | Critico | Parcial |
| Gastos | Alta de gasto unico | P0 | Critico | Si |
| Gastos | Historial y total | P0 | Alto | Si |
| Datos | Consistencia transaccional | P0 | Critico | No |
| Gastos | Edicion, baja y filtros | P1 | Alto | No |
| Programados | Recurrentes, debitos y cuotas | P1 | Critico | No |
| Ingresos | Alta de ingreso unico | P1 | Alto | Si |
| Dashboard | Consistencia de metricas | P1 | Critico | Parcial |
| Moneda | Conversion y snapshots | P1 | Critico | No |
| Referencias | Eliminacion de recursos en uso | P1 | Alto | No |
| Configuracion | Modulos y preferencias | P2 | Medio | No |
| Analisis | Proyeccion y salud | P2 | Alto | No |
| Compatibilidad | Rutas legacy | P3 | Bajo | No |
| UX | Tema, responsive y estados | P3 | Medio | No |

## 10. Dependencias para automatizacion

Antes de automatizar estos flujos se necesita:

- usuario de pruebas estable;
- forma de crear y limpiar datos por API;
- catalogos conocidos por ambiente;
- identificadores unicos para cada ejecucion;
- estrategia para fecha y zona horaria;
- tipo de cambio controlable;
- contrato definitivo de debitos automaticos;
- ambientes y URLs documentados;
- criterio de ejecucion del scheduler;
- trazabilidad entre flujo, caso, suite y defecto.

## 11. Preguntas pendientes

1. ¿El registro de usuarios es una funcion critica en produccion?
2. ¿Los ingresos recurrentes deben materializar movimientos por periodo?
3. ¿Que ocurre funcionalmente al eliminar un gasto consolidado sin eliminar su
   origen?
4. ¿El procesamiento manual puede ejecutarse varias veces con garantia formal
   de idempotencia?
5. ¿Que modulos opcionales utilizan actualmente los usuarios?
6. ¿El balance y los reportes consideran ARS como moneda base obligatoria?
7. ¿Existe una forma soportada de fijar la fecha del sistema en testing?
8. ¿Cual es el comportamiento esperado si no hay tipo de cambio disponible?
9. ¿Que navegadores y dispositivos forman parte del soporte oficial?

## 12. Proximo paso

El inventario de APIs debe relacionar cada endpoint con estos IDs de flujo,
detallar contratos, respuestas, autorizacion, validaciones, efectos secundarios
y necesidades de preparacion o limpieza de datos.
