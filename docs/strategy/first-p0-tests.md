# Primeros tests P0

## Bloqueantes reales para empezar

No todos los gaps de la matriz bloquean los primeros P0.

### Bloquean P0 contra PROD

| Gap | Por que bloquea |
| --- | --- |
| GAP-007 - Usuario E2E | Sin credenciales no hay login estable ni dashboard autenticado. |
| GAP-008 - Politica de datos | Define que tests pueden tocar PROD y cuales deben ser read-only. |
| GAP-006 - Selector strategy | No bloquea login/dashboard, pero si vuelve fragiles los flujos de formularios. |

### No bloquean los primeros P0 read-only

| Gap | Motivo |
| --- | --- |
| GAP-001 - Fecha congelada | Afecta recurrentes, cuotas, proyeccion y nightly, no login/dashboard. |
| GAP-002 - Tipo de cambio global | Bloquea tests que creen datos con conversion o cambien TC, no smoke read-only. |
| GAP-003 - Rutas divergentes | Evitable si usamos solo rutas confirmadas. |
| GAP-004 - PUT completo | Afecta updates/builders, no login ni lectura. |
| GAP-005 - Error uniforme | Podemos usar assertions flexibles al principio. |

## Enfoque inicial

Para PROD, empezar solo con `@smoke-readonly`:

- login valido;
- redireccion a login sin sesion;
- dashboard visible;
- tarjetas principales renderizadas.

No crear, editar, procesar ni borrar datos en PROD hasta tener un usuario
dedicado y una politica de limpieza.

## Politica read-only vs destructivo

### Read-only

Permitido en PROD con usuario E2E dedicado:

- login;
- logout;
- perfil autenticado;
- redireccion sin sesion;
- carga de dashboard;
- lectura de catalogos;
- lectura de preferencias;
- lectura de historiales;
- lectura de modulos;
- assertions de UI que no disparen mutaciones.

Estos tests deben llevar el tag `@smoke-readonly` cuando sean candidatos a
ejecutarse contra produccion.

### Destructivo

No permitido en PROD por defecto:

- crear, editar o eliminar gastos;
- crear, editar o eliminar ingresos;
- procesar pendientes;
- crear compras, recurrentes o debitos;
- cambiar tipo de cambio;
- modificar preferencias;
- crear, editar o eliminar tarjetas, cuentas, categorias o fuentes;
- pruebas de rate limit.

Para habilitar estos tests se requiere:

- ambiente local o staging aislado;
- `ALLOW_DESTRUCTIVE_TESTS=true`;
- datos con prefijo `E2E-`;
- cleanup por API;
- confirmacion de que no se tocaran datos manuales.

### Usuario productivo E2E

El usuario E2E productivo fue creado para smoke read-only. Las credenciales se
guardan solo en `.env` local y no deben commitearse.

## Enfoque local/staging

Cuando exista ambiente seguro:

1. crear gasto unico por UI;
2. verificar historial;
3. limpiar por API;
4. repetir para ingreso unico;
5. validar dashboard con datos controlados.
