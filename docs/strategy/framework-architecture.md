# Arquitectura del framework

## Objetivo

Definir responsabilidades, capas, fixtures, Page Objects, componentes,
builders, factories, clientes API, assertions y utilidades.

Los patrones se incorporaran cuando resuelvan variabilidad, reutilizacion o
mantenibilidad concretas detectadas durante el analisis.

## Principios

- Los tests describen comportamiento de negocio, no detalles tecnicos.
- Las interacciones con UI viven en Page Objects o componentes.
- Las llamadas HTTP viven en API Clients tipados por dominio.
- Los datos de prueba se construyen con Builders.
- Las validaciones repetidas viven en helpers de assertions.
- Los tests destructivos requieren ambiente seguro y flag explicito.
- La configuracion de ambientes se lee desde una sola capa.

## Capas

```text
tests/
├── api/                      # contratos, integracion y flujos por API
└── ui/                       # flujos E2E por navegador

src/
├── api/                      # clientes HTTP por dominio
├── assertions/               # assertions reutilizables
├── builders/                 # datos validos por defecto
├── config/                   # ambientes y guardas de seguridad
├── fixtures/                 # inyeccion de dependencias Playwright
├── pages/                    # Page Objects
└── utils/                    # utilidades transversales
```

## Patrones

### Page Object Model

Cada Page Object representa una pagina o vista estable de la app. Su
responsabilidad es navegar, localizar elementos y ejecutar acciones de usuario.
No deberia contener reglas de negocio complejas ni assertions extensas.

Ejemplos actuales:

- `LoginPage`
- `DashboardPage`
- `GastosPage`
- `IngresosPage`
- `ConfiguracionPage`
- `PerfilPage`

Proximos candidatos:

- componentes para modales, tabs y formularios compartidos.

### API Client

Cada cliente encapsula endpoints de un dominio. Esto evita repetir URLs,
headers y payloads en los tests.

Implementados:

- `AuthApiClient`
- `CatalogosApiClient`
- `GastosUnicosApiClient`
- `IngresosUnicosApiClient`

Base compartida:

- `BaseApiClient`: resuelve `apiUrl` y headers autenticados.

Proximos candidatos:

- `TarjetasApiClient`
- `CuentasBancariasApiClient`
- `TipoCambioApiClient`

### Builder

Los Builders generan payloads validos por defecto y permiten sobreescribir solo
lo relevante para cada caso. Esto reduce ruido y hace mas facil cambiar datos
cuando el contrato evoluciona.

Implementado:

- `GastoUnicoBuilder`
- `IngresoUnicoBuilder`

Proximos candidatos:

- `CompraBuilder`
- `GastoRecurrenteBuilder`

### Fixtures como composicion

Las fixtures de Playwright funcionan como punto de inyeccion de dependencias.
Los tests reciben objetos listos para usar:

- `authApi`
- `catalogosApi`
- `gastosUnicosApi`
- `ingresosUnicosApi`
- `gastoUnicoBuilder`
- `ingresoUnicoBuilder`
- `authSession`
- `loginPage`
- `dashboardPage`
- `gastosPage`
- `ingresosPage`
- `configuracionPage`
- `perfilPage`

Esto mantiene los tests cortos y evita instanciar dependencias en cada spec.

### Assertions reutilizables

Las assertions comunes viven en `src/assertions`. La regla general:

- assertion unica y especifica: puede quedar en el test;
- assertion repetida o contractual: helper reutilizable.

Ejemplo actual:

- `expectSuccessfulResponse`
- `expectUnauthorizedResponse`

### Safety guard

Los tests destructivos no deben depender solo de convenciones humanas. La capa
`src/config/safety.ts` centraliza la decision:

- bloquea siempre contra `TEST_ENV=prod`;
- exige `ALLOW_DESTRUCTIVE_TESTS=true` para local/staging.

## Tags

- `@P0`, `@P1`, `@P2`, `@P3`: prioridad.
- `@smoke-readonly`: candidato a smoke productivo sin mutaciones.
- `@destructive`: crea, edita, procesa o elimina datos.
- `@contract`: valida contrato API.
- `@ui`: test de UI.
- `@api`: test de API.

## Convencion para primeros P0

1. Preparar datos por API cuando el flujo sea UI.
2. Ejecutar la accion principal por UI o API segun el objetivo del caso.
3. Verificar por capa distinta cuando aporte confianza.
4. Limpiar por API en `finally` para no dejar residuos.
5. Mantener `PROD` solo para smoke read-only.

## Estado

Arquitectura inicial definida e implementada parcialmente. La siguiente pieza es
agregar el primer flujo destructivo seguro contra staging/local usando
`GastoUnicoBuilder`, `GastosUnicosApiClient` y cleanup garantizado.
