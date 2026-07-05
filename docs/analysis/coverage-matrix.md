# Matriz de cobertura

## Objetivo

Relacionar funcionalidades, riesgos, prioridades, capas de prueba, ambientes y
navegadores.

## Estado

- Fecha de relevamiento: 2026-06-23.
- Fuente: `functional-inventory.md`, `critical-flows.md` y `api-inventory.md`.
- Estado: matriz inicial completa; pendiente de validacion exploratoria con la
  app y API corriendo.

## Leyenda

### Capas

| Marca | Significado |
| --- | --- |
| H | Happy path o comprobacion representativa |
| C | Cobertura contractual, limites o errores |
| D | Preparacion, verificacion o limpieza de datos |
| R | Regla de negocio profunda |
| - | No aplica o no se recomienda en esa capa |

### Suites

| Suite | Proposito |
| --- | --- |
| Smoke | Salud minima, rapida y determinista |
| Critical | Caminos principales de negocio |
| Regression | Cobertura funcional amplia |
| Contract | Contratos HTTP, errores, seguridad y schemas |
| Nightly | Cobertura extendida o costosa |
| Exploratory | Validacion manual guiada antes de automatizar |

### Navegadores

| Marca | Alcance |
| --- | --- |
| Ch | Chromium |
| FF | Firefox |
| WK | WebKit |
| Mobile | viewport mobile representativo |
| N/A | No aplica navegador |

Regla inicial: los tests API, integracion y unidad no se multiplican por
navegador. La UI smoke corre primero en Chromium. Cross-browser se reserva para
flujos UI criticos, navegacion, formularios y responsive.

## Matriz principal

| ID | Prioridad | Riesgo | UI E2E | API | Integracion | Unidad | Suite inicial | Smoke | Navegadores | Datos necesarios |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CF-AUTH-001 | P0 | Alto | H | C | C | - | Smoke, Contract | Si | Ch | Usuario existente |
| CF-AUTH-002 | P0 | Critico | H | C | C | - | Smoke, Contract | Parcial | Ch | Dos usuarios, token valido/invalido |
| CF-EXP-001 | P0 | Critico | H | D,C | R | R | Smoke, Critical | Si | Ch | Catalogos, TC, gasto E2E |
| CF-EXP-002 | P0 | Alto | H | C,D | R | R | Smoke, Critical | Si | Ch | Gastos controlados en periodo |
| CF-DATA-001 | P0 | Critico | - | C | R | R | Contract, Nightly | No | N/A | Origenes, fallas simuladas |
| CF-EXP-003 | P1 | Alto | H | C,D | R | - | Critical | No | Ch | Gasto creado por API |
| CF-EXP-004 | P1 | Alto | H | C,D | R | - | Critical | No | Ch | Gasto y origen eliminables |
| CF-EXP-005 | P1 | Alto | H | C | - | R | Regression | No | Ch | Dataset con varias categorias/fechas |
| CF-EXP-006 | P1 | Medio | H | - | - | R | Regression | No | Ch | Dataset filtrable |
| CF-SCH-001 | P1 | Critico | H | C,D | R | R | Nightly, Contract | No | Ch | Frecuencias, fecha controlada |
| CF-SCH-002 | P1 | Critico | H | C,D | R | R | Nightly, Contract | No | Ch | Tarjeta/cuenta, fecha controlada |
| CF-SCH-003 | P1 | Critico | H | C,D | R | R | Nightly, Contract | No | Ch | Tarjeta credito, compra en cuotas |
| CF-SCH-004 | P1 | Alto | - | - | R | R | Nightly | No | N/A | Fechas de cierre/vencimiento |
| CF-SCH-005 | P1 | Critico | H | C,D | R | R | Nightly, Contract | No | Ch | Pendientes aislados |
| CF-INC-001 | P1 | Alto | H | C,D | R | R | Smoke, Critical | Si | Ch | Fuentes, TC, ingreso E2E |
| CF-INC-002 | P1 | Alto | H | C,D | R | R | Regression | No | Ch | Ingreso recurrente activo/inactivo |
| CF-DASH-001 | P1 | Critico | H | D | R | R | Smoke, Critical | Parcial | Ch | Gastos, ingresos, balance inicial |
| CF-CUR-001 | P1 | Critico | H | C,D | R | R | Contract, Nightly | No | Ch | TC manual, montos ARS/USD |
| CF-REF-001 | P1 | Alto | H | C,D | R | - | Contract, Regression | No | Ch | Recursos usados y libres |
| CF-AUTH-003 | P2 | Medio | H | C,D | C | - | Regression, Contract | No | Ch | Email unico |
| CF-AUTH-004 | P2 | Medio | H | C,D | C | - | Regression, Contract | No | Ch | Usuario editable |
| CF-CARD-001 | P2 | Medio | H | C,D | C | R | Regression | No | Ch | Tarjetas credito/debito |
| CF-ACCOUNT-001 | P2 | Medio | H | C,D | C | - | Regression | No | Ch | Cuentas ARS/USD |
| CF-CAT-001 | P2 | Medio | H | C,D | C | - | Regression | No | Ch | Categoria personalizada |
| CF-SOURCE-001 | P2 | Medio | H | C,D | C | - | Regression | No | Ch | Fuente personalizada |
| CF-CONF-001 | P2 | Medio | H | C,D | C | - | Regression | No | Ch | Usuario con modulos opcionales |
| CF-CONF-002 | P2 | Alto | H | C,D | C | R | Regression | No | Ch | Balance inicial controlado |
| CF-CONF-003 | P2 | Medio | H | C,D | - | - | Regression | No | Ch | Preferencias dashboard |
| CF-ANL-001 | P2 | Alto | H | C,D | R | R | Nightly | No | Ch | Dataset proyectable |
| CF-ANL-002 | P2 | Alto | H | C,D | R | R | Nightly | No | Ch | Dataset por periodo |
| CF-CUR-002 | P2 | Alto | - | C,D | R | R | Contract, Nightly | No | N/A | Proveedor simulado o TC manual |
| CF-NAV-001 | P3 | Bajo | H | - | - | - | Regression | No | Ch, FF, WK | Sesion y modulos activos |
| CF-UX-001 | P3 | Bajo | H | D | - | - | Regression | No | Ch | Preferencia de tema |
| CF-UX-002 | P3 | Medio | H | - | - | - | Nightly | No | Ch, FF, WK, Mobile | Usuario con modulos visibles |
| CF-UX-003 | P3 | Medio | H | - | - | - | Exploratory, Nightly | No | Ch | Estados simulados o interceptados |

## Cobertura por suite

### Smoke

Objetivo: detectar en pocos minutos si la version esta usable.

Incluye:

- `CF-AUTH-001`: login valido y dashboard visible;
- `CF-AUTH-002`: redireccion a login sin sesion;
- `CF-EXP-001`: crear gasto unico por UI y verificar en historial;
- `CF-EXP-002`: total del periodo con datos controlados;
- `CF-INC-001`: crear ingreso unico por UI y verificar en historial;
- `CF-DASH-001`: indicadores principales renderizados con datos conocidos.

Ejecucion inicial:

- navegador: Chromium;
- usuario: preexistente;
- setup: API;
- cleanup: API;
- sin scheduler;
- sin proveedor externo de tipo de cambio;
- sin cross-browser.

### Critical

Objetivo: cubrir los caminos centrales con mas profundidad que smoke.

Incluye:

- CRUD completo de gasto unico;
- historial, filtros y consistencia con dashboard;
- ingreso unico;
- dashboard con balance inicial;
- errores funcionales principales.

Navegadores:

- Chromium en PR;
- Chromium + Firefox + WebKit en nightly para los flujos UI de gasto, ingreso y
  dashboard.

### Contract

Objetivo: validar APIs y reglas de frontera sin depender de UI.

Incluye:

- autenticacion y autorizacion cruzada;
- validaciones de body/query;
- recursos inexistentes;
- relaciones ajenas o inexistentes;
- recursos en uso;
- multimoneda;
- preferencias;
- rutas declaradas pero no montadas como hallazgos contractuales, no como
  expectativas estables.

Herramienta sugerida:

- Playwright `APIRequestContext` dentro del repo de automatizacion;
- helpers API tipados;
- assertions de schema minimo.

### Nightly

Objetivo: cubrir reglas costosas, dependientes de fecha o de combinatoria.

Incluye:

- recurrentes, debitos, cuotas y catch-up;
- vencimientos de tarjeta;
- proyeccion;
- salud financiera;
- cross-browser;
- responsive.

La ejecucion nocturna debe usar una base aislada o usuarios exclusivos para no
consumir datos de pruebas manuales.

## Cobertura por capa

### UI E2E

Automatizar en UI solo lo que necesita demostrar que la experiencia funciona de
punta a punta:

- login y proteccion visible;
- alta de gasto unico;
- alta de ingreso unico;
- lectura de historial y dashboard;
- formularios de recursos secundarios en un caso representativo;
- rutas legacy;
- responsive de navegacion y formularios principales.

Evitar que la UI cargue toda la matriz de validaciones. Las validaciones
exhaustivas pertenecen a API, unidad o integracion.

### API

Automatizar como contrato:

- auth;
- gastos unicos;
- ingresos unicos;
- catalogos;
- preferencias;
- tarjetas/cuentas;
- referencias en uso;
- multimoneda;
- endpoints de procesamiento.

Tambien debe usarse como infraestructura para setup y cleanup. Esas llamadas no
cuentan por si mismas como cobertura funcional salvo que tengan assertions de
contrato.

### Integracion

Reservar para reglas que requieren base de datos, transacciones o servicios:

- generacion de gasto asociado al gasto unico;
- borrado en cascada controlado;
- procesamiento recurrente/debito/cuotas;
- idempotencia por periodo;
- aislamiento por usuario;
- restricciones de recursos en uso.

Estas pruebas probablemente viven mejor en el backend, pero la matriz las
mantiene visibles para no intentar cubrirlas de forma fragil desde UI.

### Unidad

Reservar para reglas puras o altamente parametrizables:

- conversion y formato de montos;
- filtros y agregaciones del cliente;
- fechas de cierre/vencimiento;
- frecuencia y catch-up;
- proyeccion;
- salud financiera;
- builders y factories del framework cuando existan.

## Datos de prueba

### Datos base

- usuario E2E estable;
- segundo usuario para aislamiento;
- catalogos cargados por seed;
- tipo de cambio manual conocido;
- modulos opcionales habilitados segun suite.

### Datos por test

Cada test que crea entidades debe usar un prefijo unico:

```text
E2E-{runId}-{flowId}-{timestamp}
```

Datos creados por test:

- gastos unicos;
- ingresos unicos;
- tarjetas;
- cuentas;
- categorias personalizadas;
- fuentes personalizadas;
- compras, recurrentes y debitos solo en suites controladas.

### Limpieza

Orden recomendado:

1. eliminar gastos/ingresos creados por origen;
2. eliminar compras, recurrentes y debitos;
3. eliminar tarjetas y cuentas;
4. eliminar categorias y fuentes personalizadas;
5. restaurar preferencias modificadas;
6. restaurar tipo de cambio solo si el ambiente lo permite.

No borrar catalogos del sistema ni datos manuales del usuario.

## Navegadores y ambientes

### Pull request

- UI smoke: Chromium;
- API contract rapido: N/A navegador;
- sin scheduler;
- sin proveedor externo.

### Main branch

- UI critical: Chromium;
- API contract completo;
- evidencia con trace/screenshot en fallos.

### Nightly

- UI critical en Chromium, Firefox y WebKit;
- responsive en Chromium mobile viewport;
- programados, cuotas, proyeccion y salud;
- retries controlados;
- reportes y artifacts.

### Produccion

Solo smoke no destructivo o con usuario dedicado y datos eliminables. No correr:

- procesamiento global;
- tipo de cambio manual;
- pruebas de rate limit;
- pruebas destructivas de catalogos o preferencias reales.

## Gaps y bloqueos

| ID | Gap | Impacto | Decision pendiente |
| --- | --- | --- | --- |
| GAP-001 | No hay estrategia definida para fecha congelada | Recurrentes, cuotas, proyeccion | Definir clock controlado o dataset con fechas relativas |
| GAP-002 | Tipo de cambio manual parece global | Interferencia entre tests | Confirmar ambiente aislado o mock |
| GAP-003 | Rutas frontend/backend divergentes | Tests podrian automatizar codigo muerto | Confirmar alcance de rutas no montadas |
| GAP-004 | PUT como actualizacion completa | Builders deben enviar objetos completos | Confirmar si es contrato o bug |
| GAP-005 | Formato de error no uniforme | Assertions compartidas mas complejas | Definir schema minimo flexible |
| GAP-006 | No hay selector strategy definida | UI tests fragiles | Agregar `data-testid` selectivamente |
| GAP-007 | No hay usuario E2E provisionado | Bloquea smoke estable | Crear credenciales por ambiente |
| GAP-008 | No hay politica de datos por ambiente | Riesgo de borrar datos reales | Definir ambientes y usuarios |

## Recomendacion de implementacion incremental

1. Crear helpers API para login, catalogos, gastos unicos e ingresos unicos.
2. Crear builders para gasto unico e ingreso unico.
3. Implementar smoke API de auth/catalogos.
4. Implementar UI smoke de login.
5. Implementar vertical slice `CF-EXP-001` con setup/cleanup por API.
6. Agregar `CF-INC-001`.
7. Agregar dashboard/historial con datos controlados.
8. Recién despues incorporar tarjetas, cuentas y recursos en uso.
9. Dejar programados, cuotas y proyecciones para nightly cuando exista
   estrategia de fecha.

## Trazabilidad inicial de tags

Los tests deberian usar tags combinables:

```text
@smoke
@critical
@regression
@contract
@nightly
@ui
@api
@auth
@gastos
@ingresos
@dashboard
@P0
@P1
@CF-EXP-001
```

Un caso puede tener varios tags. Ejemplo:

```text
@smoke @ui @gastos @P0 @CF-EXP-001
```

La matriz es la fuente para decidir tags, no el nombre del archivo.
