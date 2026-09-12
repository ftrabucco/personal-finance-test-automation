import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Gastos history API destructive @destructive @api @gastos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-002 lists a gasto unico as consolidated history and removes it with its origin', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosApi,
    gastosUnicosApi,
    gastoUnicoBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    let gastoUnicoId: number | undefined
    let originDeleted = false

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]

      expect(categoria?.id).toBeTruthy()
      expect(importancia?.id).toBeTruthy()
      expect(tipoPago?.id).toBeTruthy()

      const gasto = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-API'))
        .withCatalogos({
          categoria_gasto_id: categoria!.id,
          importancia_gasto_id: importancia!.id,
          tipo_pago_id: tipoPago!.id,
        })
        .build()

      const createResponse = await gastosUnicosApi.create(authSession.token, gasto)
      const createBody = await expectSuccessfulResponse(createResponse)
      gastoUnicoId = createBody.data?.id ?? createBody.data?.gasto?.id

      expect(gastoUnicoId).toBeTruthy()

      await expect
        .poll(async () => gastosApi.findByDescription(authSession.token, gasto.descripcion), {
          message: 'Expected gasto unico to be materialized in consolidated history.',
        })
        .toHaveLength(1)

      const [consolidatedGasto] = await gastosApi.findByDescription(authSession.token, gasto.descripcion)

      expect(consolidatedGasto.descripcion).toBe(gasto.descripcion)
      expect(Number(consolidatedGasto.monto ?? consolidatedGasto.monto_ars)).toBe(gasto.monto)

      const deleteResponse = await gastosUnicosApi.delete(authSession.token, gastoUnicoId!)
      await expectSuccessfulResponse(deleteResponse)
      originDeleted = true

      await expect
        .poll(async () => gastosApi.findByDescription(authSession.token, gasto.descripcion), {
          message: 'Expected consolidated gasto to be removed after deleting its origin.',
        })
        .toHaveLength(0)
    } finally {
      if (gastoUnicoId && !originDeleted) {
        const deleteResponse = await gastosUnicosApi.delete(authSession.token, gastoUnicoId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
