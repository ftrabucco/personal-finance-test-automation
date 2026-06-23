# Inventario de APIs

## 1. Objetivo

Documentar la superficie HTTP actual, sus contratos relevantes, autenticacion,
validaciones, efectos secundarios y uso potencial dentro del framework de
automatizacion.

## 2. Fuente y estado

- Fecha de relevamiento: 2026-06-15.
- Base URL local observada: `http://localhost:3030/api`.
- Fuente principal: rutas montadas en `src/routes/api/*.routes.js`.
- Fuentes complementarias: controladores, middleware activo, servicios,
  modelos y consumidores del frontend.
- Estado: inventario estatico inicial completo; pendiente de ejecutar requests
  reales y capturar contratos de respuesta por ambiente.

El archivo Swagger no se considera fuente de verdad porque contiene endpoints
que no estan montados actualmente y omite otros existentes.

## 3. Convenciones globales

### 3.1 Autenticacion

Con excepcion de registro, login y health check, las rutas requieren:

```http
Authorization: Bearer <jwt>
```

Respuestas de autenticacion esperadas:

| Situacion | Estado | Codigo |
| --- | --- | --- |
| Header ausente | 401 | `MISSING_TOKEN` |
| Token vacio o formato invalido | 401 | `INVALID_TOKEN_FORMAT` o `INVALID_TOKEN` |
| Token invalido o expirado | 401 | `INVALID_TOKEN` |

El middleware recupera al usuario desde base de datos en cada request. Un token
valido de un usuario eliminado tambien debe rechazarse.

### 3.2 Formato de respuesta

Formato general exitoso:

```json
{
  "success": true,
  "data": {}
}
```

Las colecciones pueden incluir:

```json
{
  "meta": {
    "total": 10,
    "type": "collection"
  }
}
```

Formato general de error:

```json
{
  "success": false,
  "error": "Descripcion",
  "details": "Detalle opcional",
  "timestamp": "ISO-8601"
}
```

Autenticacion utiliza parcialmente otro formato con `message` y un codigo
`error`. Los tests no deben asumir un unico schema de error hasta que el
contrato se unifique.

### 3.3 Estados HTTP principales

- `200`: consulta, actualizacion o eliminacion exitosa;
- `201`: creacion exitosa;
- `400`: validacion o regla de negocio;
- `401`: autenticacion ausente o invalida;
- `403`: recurso del sistema o propiedad de otro usuario;
- `404`: recurso no visible para el usuario o inexistente;
- `415`: Content-Type no soportado;
- `429`: rate limit;
- `500`: error no controlado;
- `503`: proveedor externo no disponible.

### 3.4 Validacion de requests

El middleware activo:

- usa Joi;
- convierte tipos compatibles;
- rechaza campos desconocidos en los esquemas principales;
- devuelve todos los errores encontrados;
- reemplaza body y params por valores validados;
- incorpora valores default;
- exige Content-Type valido en `POST`, `PUT` y `PATCH` con body.

Riesgo contractual:

- varios endpoints `PUT` usan el mismo schema requerido que `POST`;
- por lo tanto se comportan como reemplazos completos, aunque frontend y
  comentarios los presenten como actualizaciones parciales.

### 3.5 Aislamiento

Los controladores principales agregan `usuario_id = req.user.id` en consultas y
creaciones. Para recursos ajenos normalmente se espera `404`, mientras que
categorias y fuentes pueden responder `403` cuando el recurso es visible pero
no modificable.

Todos los recursos con ID deben tener casos de autorizacion cruzada.

## 4. Endpoints publicos y autenticacion

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/health` | Salud del proceso, ambiente, version, uptime y memoria | Infraestructura |
| POST | `/api/auth/register` | Registrar usuario | `CF-AUTH-003` |
| POST | `/api/auth/login` | Obtener JWT y usuario | `CF-AUTH-001` |
| GET | `/api/auth/profile` | Obtener perfil autenticado | `CF-AUTH-002`, `CF-AUTH-004` |
| PUT | `/api/auth/profile` | Actualizar nombre/email | `CF-AUTH-004` |
| POST | `/api/auth/change-password` | Cambiar contrasena | `CF-AUTH-004` |
| POST | `/api/auth/logout` | Confirmar cierre de sesion | `CF-AUTH-001` |

Contratos relevantes:

- registro: `nombre`, `email`, `password`;
- login: `email`, `password`;
- cambio: `currentPassword`, `newPassword`;
- registro y login tienen rate limit estricto fuera de desarrollo/test;
- logout no revoca el JWT en servidor.

Casos API prioritarios:

- datos validos e invalidos;
- email duplicado;
- credenciales incorrectas;
- token ausente, alterado y expirado;
- email de perfil duplicado;
- contrasena actual incorrecta;
- respuesta sin password/hash;
- rate limit donde corresponda.

## 5. Gastos consolidados

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/gastos` | Listar con filtros y paginacion | `CF-EXP-002`, `CF-EXP-005` |
| GET | `/gastos/summary` | Obtener resumen | `CF-EXP-002`, `CF-DASH-001` |
| GET | `/gastos/generate` | Generar pendientes | `CF-SCH-005` |
| POST | `/gastos/search` | Busqueda avanzada | `CF-EXP-005` |
| GET | `/gastos/:id` | Obtener por ID | `CF-EXP-002` |
| POST | `/gastos` | Crear gasto consolidado | `CF-DATA-001` |
| PUT | `/gastos/:id` | Actualizar gasto consolidado | `CF-EXP-003` |
| DELETE | `/gastos/:id` | Eliminar gasto consolidado | `CF-EXP-004` |

Filtros:

- categoria, importancia, frecuencia, tipo de pago y tarjeta;
- rango de fechas;
- rangos ARS/USD;
- tipo e ID de origen;
- `limit`, `offset`, campo y direccion de orden.

Observaciones:

- `GET /gastos/generate` modifica estado, lo cual contradice la semantica
  segura e idempotente esperada de GET;
- debe validarse la diferencia entre eliminar el gasto consolidado y eliminar
  su entidad de origen;
- el alta directa de un gasto exige `tipo_origen` e `id_origen`, por lo que no
  parece adecuada como helper general de datos sin un origen existente.

## 6. Gastos unicos

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/gastos-unicos` | Listar y filtrar | `CF-EXP-002`, `CF-EXP-005` |
| GET | `/gastos-unicos/:id` | Obtener por ID | `CF-EXP-001` |
| POST | `/gastos-unicos` | Crear origen y gasto asociado | `CF-EXP-001`, `CF-DATA-001` |
| PUT | `/gastos-unicos/:id` | Actualizar origen y gasto asociado | `CF-EXP-003` |
| DELETE | `/gastos-unicos/:id` | Eliminar origen y gasto asociado | `CF-EXP-004` |

Body principal:

- `descripcion`: 3-255 caracteres;
- `monto`: positivo;
- `fecha`: ISO, no futura;
- `categoria_gasto_id`;
- `importancia_gasto_id`;
- `tipo_pago_id`;
- `tarjeta_id`: opcional;
- `moneda_origen`: `ARS` o `USD`.

Campos calculados como `monto_ars`, `monto_usd` y `tipo_cambio_usado` estan
prohibidos en requests.

Efectos secundarios:

- el alta genera inmediatamente un gasto consolidado dentro del servicio;
- la actualizacion sincroniza el gasto asociado;
- la eliminacion borra ambos dentro de una transaccion.

Es el recurso preferido para el primer vertical slice y para preparar gastos
deterministas mediante API.

## 7. Compras

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/compras` | Listar y filtrar | `CF-SCH-003` |
| GET | `/compras/:id` | Obtener por ID | `CF-SCH-003` |
| POST | `/compras` | Crear compra y eventualmente cuotas | `CF-SCH-003`, `CF-SCH-004` |
| PUT | `/compras/:id` | Actualizar compra | `CF-SCH-003` |
| DELETE | `/compras/:id` | Eliminar compra | `CF-SCH-003` |

Body principal:

- descripcion y monto total;
- fecha no futura;
- 1-60 cuotas;
- cuotas pagadas mayor o igual a 0 y no superior al total;
- categoria, importancia y tipo de pago;
- tarjeta opcional;
- moneda ARS/USD.

Efectos secundarios del alta:

- con `cuotas_pagadas > 0` genera gastos historicos;
- una compra de una cuota sin tarjeta de credito puede generar gasto inmediato;
- con tarjeta de credito espera al vencimiento;
- almacena snapshot de conversion;
- una falla de conversion tiene fallback a ARS.

Reglas de actualizacion:

- no permite reducir cuotas por debajo de gastos ya generados;
- debe conservar consistencia entre cuotas, estado pendiente y gastos.

## 8. Gastos recurrentes

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/gastos-recurrentes` | Listar y filtrar | `CF-SCH-001` |
| GET | `/gastos-recurrentes/:id` | Obtener por ID | `CF-SCH-001` |
| POST | `/gastos-recurrentes` | Crear definicion | `CF-SCH-001` |
| PUT | `/gastos-recurrentes/:id` | Actualizar definicion | `CF-SCH-001` |
| DELETE | `/gastos-recurrentes/:id` | Eliminar definicion | `CF-SCH-001` |
| POST | `/gastos-recurrentes/:id/procesar` | Procesar mes actual | `CF-SCH-001`, `CF-SCH-005` |

Body principal:

- datos comunes de gasto;
- `dia_de_pago`: 1-31;
- `mes_de_pago`: 1-12 o null;
- `frecuencia_gasto_id`;
- `fecha_inicio` opcional;
- `activo`;
- moneda ARS/USD.

Procesamiento individual:

- rechaza definicion inexistente o inactiva;
- si ya fue procesada devuelve `200` con cero generados;
- si corresponde genera un gasto y devuelve resumen/detalle;
- debe ser idempotente por periodo.

No existe endpoint dedicado de toggle; el estado se modifica mediante `PUT`
completo.

## 9. Debitos automaticos

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/debitos-automaticos` | Listar y filtrar | `CF-SCH-002` |
| GET | `/debitos-automaticos/:id` | Obtener por ID | `CF-SCH-002` |
| POST | `/debitos-automaticos` | Crear definicion | `CF-SCH-002` |
| PUT | `/debitos-automaticos/:id` | Actualizar definicion | `CF-SCH-002` |
| DELETE | `/debitos-automaticos/:id` | Eliminar definicion | `CF-SCH-002` |
| POST | `/debitos-automaticos/:id/procesar` | Procesar mes actual | `CF-SCH-002`, `CF-SCH-005` |

Body principal:

- datos comunes de gasto;
- tarjeta o cuenta bancaria opcionales;
- `dia_de_pago`: 1-31 o null;
- `usa_vencimiento_tarjeta`;
- `frecuencia_gasto_id`;
- `activo`;
- moneda ARS/USD.

Casos contractuales necesarios:

- tarjeta y cuenta como alternativas;
- vencimiento de tarjeta con dia nulo;
- dia manual sin tarjeta;
- tarjeta ajena o cuenta ajena;
- recurso inactivo;
- segundo procesamiento del mismo periodo.

No existe endpoint dedicado de toggle; el frontend usa `PUT`.

## 10. Ingresos unicos

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/ingresos-unicos` | Listar y filtrar | `CF-INC-001` |
| GET | `/ingresos-unicos/:id` | Obtener por ID | `CF-INC-001` |
| POST | `/ingresos-unicos` | Crear ingreso | `CF-INC-001` |
| PUT | `/ingresos-unicos/:id` | Actualizar ingreso | `CF-INC-001` |
| DELETE | `/ingresos-unicos/:id` | Eliminar ingreso | `CF-INC-001` |

Body:

- descripcion 3-255;
- monto positivo;
- fecha ISO no futura;
- fuente de ingreso;
- moneda ARS/USD.

Los importes convertidos son calculados por backend. Este recurso es apropiado
para preparar y limpiar datos de los smoke tests de ingresos.

## 11. Ingresos recurrentes

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/ingresos-recurrentes` | Listar y filtrar | `CF-INC-002` |
| GET | `/ingresos-recurrentes/:id` | Obtener por ID | `CF-INC-002` |
| POST | `/ingresos-recurrentes` | Crear definicion | `CF-INC-002` |
| PUT | `/ingresos-recurrentes/:id` | Actualizar definicion | `CF-INC-002` |
| PATCH | `/ingresos-recurrentes/:id/toggle-activo` | Alternar estado | `CF-INC-002` |
| DELETE | `/ingresos-recurrentes/:id` | Eliminar definicion | `CF-INC-002` |

Body:

- descripcion, monto y fuente;
- dia 1-31 y mes opcional 1-12;
- frecuencia;
- fechas de inicio y fin opcionales;
- activo;
- moneda ARS/USD.

Debe comprobarse `fecha_fin >= fecha_inicio`, ya que no se observo una regla
Joi explicita para esa relacion.

## 12. Tarjetas

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/tarjetas` | Listar con filtros | `CF-CARD-001` |
| GET | `/tarjetas/stats` | Estadisticas | `CF-CARD-001` |
| GET | `/tarjetas/:id` | Obtener por ID | `CF-CARD-001` |
| GET | `/tarjetas/:id/usage` | Consultar asociaciones | `CF-REF-001` |
| POST | `/tarjetas` | Crear | `CF-CARD-001` |
| PUT | `/tarjetas/:id` | Actualizar | `CF-CARD-001` |
| DELETE | `/tarjetas/:id` | Eliminar si no esta en uso | `CF-REF-001` |

Reglas:

- nombre y banco de 2-100 caracteres;
- tipo `debito`, `credito` o `virtual`;
- ultimos cuatro digitos opcionales;
- credito exige cierre y vencimiento 1-31;
- otros tipos no deben tener esos dias;
- permiso de cuotas booleano.

La eliminacion consulta uso en gastos y compras y responde `400` cuando hay
asociaciones.

## 13. Cuentas bancarias

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/cuentas-bancarias` | Listar con filtros | `CF-ACCOUNT-001` |
| GET | `/cuentas-bancarias/stats` | Estadisticas | `CF-ACCOUNT-001` |
| GET | `/cuentas-bancarias/:id` | Obtener por ID | `CF-ACCOUNT-001` |
| GET | `/cuentas-bancarias/:id/usage` | Consultar asociaciones | `CF-REF-001` |
| POST | `/cuentas-bancarias` | Crear | `CF-ACCOUNT-001` |
| PUT | `/cuentas-bancarias/:id` | Actualizar | `CF-ACCOUNT-001` |
| DELETE | `/cuentas-bancarias/:id` | Eliminar si no esta en uso | `CF-REF-001` |

Reglas:

- nombre y banco de 2-100 caracteres;
- tipo `ahorro` o `corriente`;
- moneda ARS/USD;
- ultimos cuatro digitos opcionales;
- estado activo booleano.

La eliminacion responde `400` cuando la cuenta participa en debitos.

## 14. Catalogos

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/catalogos` | Obtener todos los catalogos |
| GET | `/catalogos/categorias` | Categorias visibles |
| GET | `/catalogos/importancias` | Importancias |
| GET | `/catalogos/tipos-pago` | Tipos de pago |
| GET | `/catalogos/frecuencias` | Frecuencias |
| GET | `/catalogos/fuentes-ingreso` | Fuentes visibles |

Uso en automatizacion:

- resolver IDs por nombre, nunca fijar IDs de base de datos en builders;
- validar que los catalogos minimos existan antes de una suite;
- cachear por worker o ejecucion, no globalmente entre ambientes;
- evitar modificar catalogos del sistema.

## 15. Categorias personalizadas

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/categorias` | Sistema + usuario | `CF-CAT-001` |
| GET | `/categorias/:id` | Obtener visible por ID | `CF-CAT-001` |
| POST | `/categorias` | Crear personalizada | `CF-CAT-001` |
| PUT | `/categorias/:id` | Actualizar propia | `CF-CAT-001` |
| PATCH | `/categorias/:id/toggle-activo` | Alternar propia/visibilidad | `CF-CAT-001` |
| DELETE | `/categorias/:id` | Eliminar propia sin uso | `CF-CAT-001`, `CF-REF-001` |

Reglas:

- nombre requerido y unico entre categorias visibles del sistema/usuario;
- categorias del sistema no se modifican ni eliminan;
- categorias ajenas no se modifican;
- una categoria usada debe desactivarse en lugar de eliminarse.

El frontend declara `PUT /categorias/reorder`, pero no existe una ruta montada
equivalente.

## 16. Fuentes de ingreso personalizadas

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/fuentes-ingreso` | Sistema + usuario | `CF-SOURCE-001` |
| GET | `/fuentes-ingreso/:id` | Obtener visible por ID | `CF-SOURCE-001` |
| POST | `/fuentes-ingreso` | Crear personalizada | `CF-SOURCE-001` |
| PUT | `/fuentes-ingreso/:id` | Actualizar propia | `CF-SOURCE-001` |
| PATCH | `/fuentes-ingreso/:id/toggle-activo` | Alternar propia/visibilidad | `CF-SOURCE-001` |
| DELETE | `/fuentes-ingreso/:id` | Eliminar propia sin uso | `CF-SOURCE-001`, `CF-REF-001` |

Las reglas reflejan las de categorias.

El frontend declara `PUT /fuentes-ingreso/reorder`, pero no existe una ruta
montada equivalente.

## 17. Preferencias y modulos

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/preferencias` | Obtener o crear defaults | `CF-CONF-001`, `CF-CONF-002`, `CF-CONF-003` |
| PUT | `/preferencias` | Actualizar preferencias | `CF-CONF-001`, `CF-CONF-002`, `CF-CONF-003` |
| PATCH | `/preferencias/modulos` | Activar/desactivar modulo | `CF-CONF-001` |
| GET | `/modulos` | Modulos con estado del usuario | `CF-CONF-001` |
| GET | `/modulos/disponibles` | Metadata de modulos | `CF-CONF-001` |

Campos aceptados en actualizacion:

- `modulos_activos`;
- `tema`;
- `balance_inicial`;
- `dashboard_sections`.

Reglas:

- modulos desconocidos se filtran silenciosamente en actualizacion masiva;
- un modulo core no puede desactivarse mediante toggle;
- secciones desconocidas se filtran;
- `GET /preferencias` crea el registro si no existe.

El controller no aplica un schema Joi explicito al body. Deben cubrirse tipos
incorrectos, balance negativo y arrays malformados para conocer el contrato
real.

## 18. Tipo de cambio

| Metodo | Ruta | Proposito | Flujo |
| --- | --- | --- | --- |
| GET | `/tipo-cambio/actual` | Cotizacion activa | `CF-CUR-001` |
| GET | `/tipo-cambio/historico` | Historial filtrado | `CF-CUR-001`, `CF-CUR-002` |
| POST | `/tipo-cambio/manual` | Configurar cotizacion | `CF-CUR-002` |
| POST | `/tipo-cambio/actualizar` | Consultar proveedor externo | `CF-CUR-002` |
| POST | `/tipo-cambio/convertir` | Convertir monto | `CF-CUR-001` |

Reglas:

- valores de compra/venta positivos;
- compra usa venta como fallback;
- proveedor seleccionable: `dolarapi`, `bcra` o `auto`;
- sin cotizacion devuelve `404`;
- proveedor no disponible puede devolver `503`.

Discrepancias del cliente:

- el frontend declara GET/POST/DELETE sobre `/tipo-cambio` y consultas por ID o
  fecha que no estan montadas;
- para funcionalidad activa deben usarse las cinco rutas listadas arriba.

Los tests normales no deben depender de APIs externas. La cotizacion manual es
la opcion de setup, siempre que el ambiente permita modificarla sin afectar a
otros usuarios.

## 19. Analisis financiero

| Metodo | Ruta | Parametros | Flujo |
| --- | --- | --- | --- |
| GET | `/proyeccion` | `meses`: 1-12, default 3 | `CF-ANL-001` |
| GET | `/salud-financiera` | semana, mes, trimestre o anio | `CF-ANL-002` |
| GET | `/balance/evolucion` | `desde` y `hasta` en YYYY-MM | `CF-DASH-001`, `CF-CONF-002` |

Estos endpoints son de lectura, pero sus resultados dependen de:

- datos actuales del usuario;
- definiciones activas;
- frecuencias y fechas;
- tipo de cambio;
- balance inicial;
- zona horaria.

Requieren datasets pequeños y calculables, no aserciones contra datos
compartidos.

## 20. Rutas declaradas pero no montadas

Consumidores o documentacion mencionan rutas sin implementacion activa:

- `PUT /categorias/reorder`;
- `PUT /fuentes-ingreso/reorder`;
- `POST /procesamiento/gastos-recurrentes`;
- `POST /procesamiento/compras`;
- `POST /procesamiento/debitos-automaticos`;
- `GET /tipo-cambio`;
- `POST /tipo-cambio`;
- `GET /tipo-cambio/fecha/:fecha`;
- `GET /tipo-cambio/:id`;
- `DELETE /tipo-cambio/:id`;
- `GET /gastos/all` documentado en Swagger/README.

No deben automatizarse como comportamiento esperado. Primero corresponde
confirmar si son deuda del backend, codigo frontend no utilizado o endpoints
retirados.

## 21. Aptitud para setup y cleanup

### Recomendados

- login para obtener token;
- catalogos para resolver relaciones;
- gastos unicos para preparar gastos;
- ingresos unicos para preparar ingresos;
- categorias/fuentes personalizadas cuando el escenario las necesita;
- tarjetas y cuentas aisladas;
- DELETE del mismo recurso creado por el test.

### Uso controlado

- preferencias, porque modifican estado persistente amplio;
- tipo de cambio manual, porque aparenta ser global y no por usuario;
- compras/recurrentes/debitos, por sus efectos secundarios temporales;
- procesamiento global, porque puede consumir datos de otros tests del mismo
  usuario.

### No recomendados como setup generico

- crear gastos consolidados directamente;
- actualizar cotizacion desde proveedor real;
- reutilizar recursos compartidos mutables;
- borrar catalogos del sistema.

## 22. Cobertura API transversal

Cada recurso protegido deberia contemplar:

1. happy path;
2. body o query invalidos;
3. campos obligatorios y desconocidos;
4. limites numericos y fechas;
5. recurso inexistente;
6. recurso de otro usuario;
7. relaciones inexistentes o ajenas;
8. persistencia posterior;
9. efectos secundarios;
10. eliminacion y segunda eliminacion;
11. filtros, orden y paginacion;
12. schema minimo de respuesta;
13. ausencia de datos sensibles;
14. Content-Type incorrecto;
15. token ausente, invalido y expirado.

## 23. Hallazgos contractuales

| ID | Hallazgo | Impacto |
| --- | --- | --- |
| API-001 | `GET /gastos/generate` modifica estado | Cache, reintentos y semantica HTTP |
| API-002 | Schemas `PUT` principales reutilizan campos requeridos de alta | El update parcial puede fallar |
| API-003 | Formato de error no es uniforme | Assertions y clientes mas complejos |
| API-004 | Swagger contiene rutas no montadas | Documentacion no confiable |
| API-005 | Frontend declara reorder sin rutas backend | Funcionalidad posiblemente rota |
| API-006 | Frontend declara rutas de tipo de cambio diferentes | Funcionalidad parcialmente desconectada |
| API-007 | Frontend declara procesamiento por tipo sin rutas backend | Helpers/hooks potencialmente muertos |
| API-008 | Existen validaciones antiguas no conectadas | Riesgo de interpretar contrato incorrecto |
| API-009 | Preferencias carece de schema de request explicito | Tipos y limites dependen de servicio/modelo |
| API-010 | Tipo de cambio manual parece global | Riesgo de interferencia entre tests |
| API-011 | Fallback de conversion puede guardar USD nulo | Resultado exitoso con conversion incompleta |
| API-012 | Logout no revoca JWT | El token sigue siendo utilizable hasta expirar |

Estos hallazgos no se consideran automaticamente defectos. Deben validarse
ejecutando la API y contrastarse con el comportamiento esperado del producto.

## 24. Proximo paso

La matriz de cobertura debe:

- relacionar cada `CF-*` con endpoints y capas;
- separar casos de contrato de helpers de setup;
- identificar cobertura existente en frontend/backend;
- seleccionar que se automatiza en Playwright APIRequestContext;
- reservar integracion/unidad para reglas de fecha, conversion y transacciones;
- marcar dependencias bloqueantes antes del scaffolding.
