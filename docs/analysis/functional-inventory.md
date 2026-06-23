# Inventario funcional

## 1. Proposito

Este documento registra las capacidades funcionales observadas en:

- `personal-finance-frontend`;
- `personal-finance-api-nodeJS`.

El inventario describe que hace actualmente el producto y sus dependencias
funcionales. La prioridad, el riesgo y la seleccion de casos automatizables se
definiran en documentos posteriores.

## 2. Estado del analisis

- Fecha de relevamiento: 2026-06-12.
- Metodo: inspeccion estatica de rutas, paginas, componentes, hooks, clientes
  API, controladores, servicios, modelos, validaciones y tests existentes.
- No se ejecuto aun la aplicacion ni se verificaron los flujos contra una base
  de datos real.
- Estado: inventario inicial completo; requiere validacion funcional mediante
  ejecucion exploratoria.

## 3. Actores

### Visitante

Usuario sin sesion autenticada.

Capacidades:

- registrarse;
- iniciar sesion;
- navegar entre registro e inicio de sesion;
- recibir redireccion a login al intentar acceder a una ruta protegida.

### Usuario autenticado

Usuario propietario de sus datos financieros.

Capacidades:

- administrar gastos e ingresos;
- administrar medios de pago y cuentas;
- consultar resumenes y analisis;
- configurar catalogos y modulos;
- actualizar perfil y credenciales;
- cerrar sesion.

No se observaron roles administrativos ni permisos diferenciados. Los recursos
estan asociados a `usuario_id`, por lo que el aislamiento entre usuarios es una
regla transversal que debera validarse especialmente por API.

## 4. Navegacion y composicion del producto

### Rutas publicas

| Ruta | Funcionalidad |
| --- | --- |
| `/login` | Inicio de sesion |
| `/register` | Registro de usuario |

### Rutas protegidas principales

| Ruta | Funcionalidad |
| --- | --- |
| `/` | Dashboard financiero |
| `/gastos` | Historial y gestion de gastos por tipo |
| `/ingresos` | Historial y gestion de ingresos por tipo |
| `/tarjetas` | Administracion de tarjetas |
| `/tarjetas/:id` | Detalle de tarjeta y consumos asociados |
| `/cuentas-bancarias` | Administracion de cuentas bancarias |
| `/proyecciones` | Proyeccion de gastos, ingresos y balance |
| `/salud-financiera` | Indicadores de salud financiera |
| `/configuracion` | Preferencias, catalogos y modulos |
| `/perfil` | Perfil y cambio de contrasena |

### Rutas de compatibilidad

Las siguientes rutas no representan paginas funcionales independientes. En el
frontend actual redirigen a una pestaña de `/gastos` o `/ingresos`, conservando
el parametro `new=true` cuando corresponde:

- `/gastos-unicos`;
- `/compras`;
- `/gastos-recurrentes`;
- `/debitos-automaticos`;
- `/ingresos-unicos`;
- `/ingresos-recurrentes`.

Estas redirecciones forman parte de la compatibilidad de navegacion y deben
probarse separadas del comportamiento de las pestañas destino.

## 5. Modulos configurables

El producto diferencia modulos core y opcionales.

### Core

- dashboard;
- historial de gastos;
- gastos unicos;
- ingresos unicos;
- configuracion;
- perfil.

### Opcionales

- compras en cuotas;
- gastos recurrentes;
- debitos automaticos;
- ingresos recurrentes;
- tarjetas;
- cuentas bancarias;
- proyecciones;
- salud financiera.

Los modulos opcionales se habilitan por usuario. Su estado controla la
visibilidad de elementos del sidebar, pestañas y alternativas de alta rapida.
Los modulos core no deberian poder deshabilitarse.

## 6. Inventario por dominio

### 6.1 Autenticacion y sesion

Capacidades:

- registrar usuario con nombre, email y contrasena;
- rechazar emails duplicados;
- iniciar sesion y obtener un JWT;
- persistir token y usuario en `localStorage`;
- persistir token en cookie para proteger la navegacion;
- obtener y actualizar el perfil autenticado;
- cambiar la contrasena verificando la contrasena actual;
- cerrar sesion y limpiar estado local;
- redirigir a login ante token ausente, invalido o expirado;
- limitar intentos de login y registro.

Reglas observadas:

- email con formato valido;
- contrasena de registro de al menos 6 caracteres, con mayuscula, minuscula y
  numero;
- el frontend exige nombre de al menos 3 caracteres y el backend al menos 2;
- el JWT tiene una duracion configurada, con valor por defecto de 7 dias;
- logout no mantiene una lista de revocacion del token en el backend.

### 6.2 Dashboard

Capacidades:

- saludar al usuario autenticado;
- mostrar gastos e ingresos del mes;
- calcular balance neto y tasa de ahorro;
- mostrar balance acumulado considerando un balance inicial configurable;
- consultar evolucion mensual y tipo de cambio;
- mostrar gastos por categoria y desglose por tipo;
- mostrar gastos recientes;
- mostrar una proyeccion resumida;
- navegar desde visualizaciones hacia vistas filtradas;
- procesar gastos programados pendientes;
- personalizar la visibilidad de secciones del dashboard.

Dependencias:

- gastos consolidados;
- ingresos unicos y recurrentes;
- categorias;
- balance historico;
- tipo de cambio;
- proyeccion y salud financiera;
- preferencias del usuario.

Parte de las agregaciones se calcula en el cliente, por lo que se debe validar
la consistencia entre dashboard, historial y respuestas API.

### 6.3 Historial de gastos

El historial consolida gastos reales originados por:

- gasto unico;
- gasto recurrente;
- debito automatico;
- cuota de una compra.

Capacidades:

- consultar gastos del mes actual por defecto;
- buscar por descripcion o categoria;
- filtrar por tipo de origen, categoria, importancia y rango de fechas;
- recibir filtros mediante parametros de URL;
- agrupar por fecha o categoria;
- paginar resultados;
- mostrar total ARS, total USD, promedio y categorias principales;
- expandir el detalle de un registro;
- eliminar un gasto consolidado con confirmacion;
- exportar el resultado filtrado a CSV;
- generar gastos pendientes;
- abrir el alta rapida de los tipos habilitados.

### 6.4 Gastos unicos

Capacidades:

- crear, consultar, editar y eliminar un gasto puntual;
- buscar, filtrar, ordenar y resumir registros;
- asociar opcionalmente una tarjeta;
- registrar el gasto en ARS o USD;
- convertir y conservar importes normalizados y tipo de cambio;
- generar inmediatamente el gasto consolidado correspondiente.

Datos principales:

- descripcion;
- monto y moneda de origen;
- fecha;
- categoria;
- importancia;
- tipo de pago;
- tarjeta opcional.

Reglas observadas:

- monto positivo;
- campos de catalogo obligatorios;
- los importes normalizados y el tipo de cambio son calculados por backend y no
  pueden enviarse en el alta o modificacion;
- el origen se marca como procesado al generar el gasto consolidado.

### 6.5 Compras en cuotas

Capacidades:

- crear, consultar, editar y eliminar una compra;
- distinguir compras pendientes y finalizadas;
- filtrar por tarjeta, categoria, moneda y fechas;
- ordenar y mostrar resumen de deuda pendiente;
- registrar cantidad de cuotas y cuotas ya pagadas;
- generar cuotas como gastos consolidados;
- calcular vencimientos segun fecha de compra, cierre y vencimiento de tarjeta;
- procesar cuotas vencidas mediante catch-up manual.

Reglas observadas:

- descripcion entre 3 y 255 caracteres;
- monto total positivo;
- entre 1 y 60 cuotas;
- cuotas pagadas no puede superar la cantidad total;
- fecha de compra no futura;
- la UI ofrece solamente tarjetas que permiten cuotas;
- para una tarjeta de credito se requieren dias de cierre y vencimiento;
- los dias se ajustan al ultimo dia disponible en meses cortos;
- los importes normalizados son calculados por backend.

### 6.6 Gastos recurrentes

Capacidades:

- crear, consultar, editar y eliminar definiciones recurrentes;
- activar o desactivar una definicion;
- buscar, filtrar y ordenar;
- consultar total mensual estimado;
- configurar frecuencia, dia de pago, inicio y mes de pago;
- procesar manualmente una definicion para el mes actual;
- generar gastos consolidados segun frecuencia;
- recuperar periodos pendientes mediante logica de catch-up.

Reglas observadas:

- dia de pago entre 1 y 31;
- mes de pago entre 1 y 12 cuando aplica;
- categoria, importancia, tipo de pago y frecuencia obligatorios;
- tarjeta opcional;
- una definicion inactiva no genera gastos;
- la UI exige mes de pago para frecuencia anual.

### 6.7 Debitos automaticos

Capacidades:

- crear, consultar, editar y eliminar un debito;
- activar o desactivar un debito;
- filtrar por estado y categoria;
- asociar el debito a una tarjeta o una cuenta bancaria;
- usar el vencimiento de una tarjeta de credito o un dia de debito manual;
- procesar individualmente el debito del periodo;
- generar gastos consolidados automaticamente.

Reglas observadas:

- tarjeta y cuenta bancaria son alternativas mutuamente excluyentes en la UI;
- dia de pago entre 1 y 31;
- frecuencia, categoria, importancia y tipo de pago obligatorios;
- un debito inactivo no genera gastos;
- soporta ARS y USD con conversion normalizada.

Nota de implementacion:

- el modelo, formulario y esquema activo de `validation.middleware.js`
  contemplan `cuenta_bancaria_id`, `usa_vencimiento_tarjeta` y un
  `dia_de_pago` opcional;
- existen archivos de validacion anteriores con un contrato diferente, pero no
  son los conectados actualmente a las rutas API.

La duplicacion de esquemas debe considerarse deuda tecnica y no una fuente de
verdad para los tests.

### 6.8 Ingresos

El producto presenta un historial consolidado en UI a partir de ingresos unicos
y recurrentes activos.

Capacidades del historial:

- consultar ingresos del mes actual;
- buscar por descripcion o fuente;
- filtrar por tipo, fuente y rango de fechas;
- agrupar por fecha o fuente;
- paginar;
- mostrar totales ARS/USD, promedio y fuentes principales;
- exportar CSV;
- eliminar ingresos unicos desde el historial.

No se observo una entidad consolidada equivalente a `Gasto` que materialice
cada ocurrencia recurrente. La UI incorpora definiciones recurrentes activas al
historial y a calculos mediante logica del cliente.

### 6.9 Ingresos unicos

Capacidades:

- crear, consultar, editar y eliminar;
- buscar, filtrar por fuente, moneda y fechas;
- ordenar y resumir resultados;
- registrar importes en ARS o USD.

Datos principales:

- descripcion;
- monto y moneda de origen;
- fecha;
- fuente de ingreso.

### 6.10 Ingresos recurrentes

Capacidades:

- crear, consultar, editar y eliminar;
- activar o desactivar;
- buscar, filtrar por fuente y estado, y ordenar;
- configurar frecuencia, dia de cobro, inicio, fin y mes de pago;
- participar en proyecciones cuando estan activos.

Reglas observadas:

- dia de cobro entre 1 y 31;
- frecuencia y fuente obligatorias;
- fecha de fin opcional;
- mes de pago opcional;
- una definicion inactiva no se considera en proyecciones.

### 6.11 Tarjetas

Capacidades:

- crear, consultar, editar y eliminar tarjetas;
- distinguir credito y debito;
- registrar banco y ultimos cuatro digitos;
- configurar cierre, vencimiento y permiso de cuotas para credito;
- consultar uso antes de eliminar;
- abrir detalle de tarjeta;
- consultar gastos unicos, compras, recurrentes y debitos asociados.

Reglas observadas:

- ultimos cuatro digitos deben tener exactamente 4 digitos cuando se informan;
- dias de cierre y vencimiento entre 1 y 31;
- las fechas de credito son obligatorias para el calculo de cuotas;
- una tarjeta en uso puede restringir su eliminacion.

### 6.12 Cuentas bancarias

Capacidades:

- crear, consultar, editar y eliminar cuentas;
- registrar nombre, banco, tipo, moneda y ultimos cuatro digitos;
- activar o desactivar una cuenta;
- consultar estadisticas y uso;
- asociar cuentas a debitos automaticos.

Reglas observadas:

- tipo `ahorro` o `corriente`;
- moneda `ARS` o `USD`;
- ultimos cuatro digitos opcionales, pero de longitud exacta cuando existen;
- una cuenta en uso puede restringir su eliminacion.

### 6.13 Categorias de gasto

Capacidades:

- listar categorias activas o incluir inactivas;
- crear, editar y eliminar categorias del usuario;
- activar o desactivar;
- ordenar;
- asignar nombre e icono;
- utilizar categorias como catalogo transversal de gastos.

Debe validarse la diferencia entre categorias del sistema, categorias del
usuario, ocultamiento y eliminacion cuando existen recursos asociados.

### 6.14 Fuentes de ingreso

Capacidades:

- listar fuentes activas o incluir inactivas;
- crear, editar y eliminar;
- activar o desactivar;
- ordenar;
- asignar nombre e icono;
- utilizar fuentes en ingresos unicos y recurrentes.

Debe validarse la diferencia entre fuentes del sistema, fuentes del usuario,
ocultamiento y eliminacion cuando existen recursos asociados.

### 6.15 Configuracion y preferencias

Capacidades:

- configurar balance inicial no negativo;
- habilitar o deshabilitar modulos opcionales;
- gestionar categorias;
- gestionar fuentes de ingreso;
- guardar tema `light`, `dark` o `system`;
- guardar secciones visibles del dashboard;
- mantener listas de categorias y fuentes ocultas.

La pantalla actual expone cuatro pestañas: general, modulos, categorias y
fuentes.

### 6.16 Perfil

Capacidades:

- consultar nombre y email;
- actualizar nombre o email;
- impedir utilizar un email ya registrado;
- cambiar contrasena indicando la actual;
- exigir confirmacion coincidente de la nueva contrasena.

### 6.17 Tipo de cambio y multimoneda

Capacidades backend:

- consultar tipo de cambio actual;
- consultar historial;
- configurar manualmente;
- actualizar desde una API externa;
- convertir montos;
- conservar snapshots de conversion en entidades financieras.

La UI consume principalmente el tipo actual y presenta importes ARS/USD. La
dependencia externa y los snapshots historicos son relevantes para pruebas
deterministas.

### 6.18 Proyecciones

Capacidades:

- seleccionar cantidad de meses;
- proyectar gastos programados por mes;
- incorporar ingresos recurrentes;
- mostrar gastos, ingresos y balance esperado;
- desplegar detalle mensual;
- actualizar los datos.

La exactitud depende de frecuencias, estados activos, fechas de inicio/fin,
cuotas, vencimientos, monedas y tipo de cambio.

### 6.19 Salud financiera

Capacidades:

- seleccionar periodo de analisis;
- mostrar ingresos, gastos, balance y distribuciones;
- analizar categorias e importancias;
- combinar informacion de gastos e ingresos;
- navegar hacia vistas relacionadas;
- actualizar los datos.

Parte de las metricas de ingresos se calcula en frontend con datos de ingresos
unicos y recurrentes.

### 6.20 Procesamiento automatico

Capacidades:

- generar inmediatamente gastos unicos;
- procesar gastos recurrentes pendientes;
- procesar debitos automaticos pendientes;
- procesar cuotas pendientes;
- procesar una definicion recurrente o debito individual;
- procesar todos los pendientes del usuario;
- evitar duplicados y registrar errores parciales;
- ejecutar catch-up para periodos vencidos cuando corresponde.

El backend utiliza estrategias diferentes para cada origen y transacciones de
base de datos durante la generacion.

## 7. Catalogos y dependencias transversales

Catalogos observados:

- categorias de gasto;
- importancias;
- tipos de pago;
- frecuencias;
- fuentes de ingreso;
- tarjetas;
- cuentas bancarias.

Relaciones relevantes:

- gastos unicos pueden asociarse a tarjeta;
- compras dependen de tarjeta cuando se usan cuotas;
- gastos recurrentes pueden asociarse a tarjeta;
- debitos automaticos pueden asociarse a tarjeta o cuenta bancaria;
- todos los gastos dependen de categoria e importancia;
- ingresos dependen de una fuente;
- proyecciones y analisis dependen de definiciones activas y catalogos.

## 8. Comportamientos transversales

- aislamiento de datos por usuario;
- autenticacion JWT en todos los endpoints financieros;
- UI responsive con representaciones de tabla y tarjetas;
- soporte de tema claro y oscuro;
- estados de carga, vacio y error;
- confirmacion antes de eliminaciones;
- notificaciones de exito y error;
- formularios con validacion frontend y backend;
- filtros y orden aplicados mayormente en cliente;
- conversion ARS/USD;
- navegacion condicionada por modulos;
- persistencia de preferencias;
- zona horaria de Argentina para generacion y fechas financieras.

## 9. Hallazgos que impactan el futuro test plan

1. Existen reglas duplicadas entre frontend, el middleware activo, archivos de
   validacion anteriores y modelos; no siempre tienen los mismos limites.
2. Varias metricas se calculan en frontend y deben contrastarse contra los
   datos de origen, no solo contra texto visible.
3. La generacion periodica depende de la fecha actual y la zona horaria, por lo
   que necesita datos controlados o capacidad de fijar el reloj.
4. El tipo de cambio externo puede introducir indeterminismo.
5. Los modulos opcionales cambian navegacion, formularios y cobertura
   disponible para cada usuario.
6. Los flujos destructivos requieren datos aislados y limpieza confiable.
7. Las rutas legacy deben cubrirse como redirecciones, evitando duplicar todos
   los tests funcionales.
8. El aislamiento entre usuarios es una regla critica visible principalmente
   en backend.
9. Los tests existentes cubren algunas unidades de autenticacion, generacion,
   balance, frecuencias y proyeccion, pero la cobertura E2E actual depende de
   datos compartidos y no constituye aun una linea base estable.

## 10. Preguntas abiertas

- ¿Que modulos se consideran parte del producto minimo y cuales experimentales?
- ¿Produccion permite registro publico o utiliza usuarios provisionados?
- ¿Como debe comportarse la eliminacion de catalogos, tarjetas o cuentas en uso?
- ¿Cual es el contrato definitivo de debitos asociados a cuentas bancarias?
- ¿Los ingresos recurrentes deben materializar ocurrencias o solo participar en
  calculos?
- ¿Que fuente y cotizacion de tipo de cambio se considera autoritativa?
- ¿Existe un ambiente de testing con base reiniciable?
- ¿El scheduler automatico se ejecuta en todos los ambientes?
- ¿Que navegadores y resoluciones representan a los usuarios reales?
- ¿Se necesita validar accesibilidad como parte de los criterios de calidad?

## 11. Proximos documentos

El siguiente analisis debe producir:

1. mapa de flujos E2E;
2. clasificacion P0-P3 basada en impacto y probabilidad;
3. inventario detallado de endpoints y contratos;
4. matriz de cobertura por UI, API, integracion y unidad;
5. smoke test plan derivado de los flujos P0, sin duplicar escenarios.
