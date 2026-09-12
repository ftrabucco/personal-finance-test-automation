import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Gastos unicos API destructive @destructive @api @gastos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-001 creates, verifies and cleans up a gasto unico', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosUnicosApi,
    gastoUnicoBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    let gastoId: number | undefined

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
        .withDescripcion(e2eContext.entityName('Gasto-Unico-API'))
        .withCatalogos({
          categoria_gasto_id: categoria!.id,
          importancia_gasto_id: importancia!.id,
          tipo_pago_id: tipoPago!.id,
        })
        .build()

      const createResponse = await gastosUnicosApi.create(authSession.token, gasto)
      const createBody = await expectSuccessfulResponse(createResponse)
      gastoId = createBody.data?.id ?? createBody.data?.gasto?.id

      expect(gastoId).toBeTruthy()

      const getResponse = await gastosUnicosApi.getById(authSession.token, gastoId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdGasto = getBody.data?.gasto ?? getBody.data

      expect(createdGasto.descripcion).toBe(gasto.descripcion)
      expect(Number(createdGasto.monto)).toBe(gasto.monto)
    } finally {
      if (gastoId) {
        const deleteResponse = await gastosUnicosApi.delete(authSession.token, gastoId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
