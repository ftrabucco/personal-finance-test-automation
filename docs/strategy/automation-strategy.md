# Estrategia de automatizacion

## Objetivo

Definir alcance, niveles de prueba, criterios de seleccion, ejecucion en CI,
reportes y mantenimiento.

## Estado

Pendiente de definicion luego del analisis funcional.

## Defect Discovery

La automatizacion tambien se usa para descubrir inconsistencias del producto.
Cuando el desarrollo de un test expone un bug o comportamiento contradictorio,
se debe registrar en [`defect-discovery-policy.md`](defect-discovery-policy.md)
y en [`../analysis/known-defects.md`](../analysis/known-defects.md).

No se deben debilitar aserciones para hacer coincidir un comportamiento roto de
la aplicacion. Si el comportamiento esperado es claro, se puede dejar un test
fallando en una rama focalizada o un test skippeado con referencia al bug hasta
que frontend/backend sean corregidos.
