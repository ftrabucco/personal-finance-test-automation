import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Gastos recurrentes API destructive @destructive @api @gastos @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-001 creates, verifies and cleans up a gasto recurrente definition', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    let gastoRecurrenteId: number | undefined

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]
      const frecuencia = catalogosBody.data?.frecuencias?.[0]

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuencia, 'Expected at least one expense frequency.')

      const gastoRecurrente = gastoRecurrenteBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Recurrente-API'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
          frecuencia_gasto_id: frecuencia.id,
        })
        .build()

      const createResponse = await gastosRecurrentesApi.create(authSession.token, gastoRecurrente)
      const createBody = await expectSuccessfulResponse(createResponse)
      gastoRecurrenteId = createBody.data?.id ?? createBody.data?.gastoRecurrente?.id

      expect(gastoRecurrenteId).toBeTruthy()

      const getResponse = await gastosRecurrentesApi.getById(authSession.token, gastoRecurrenteId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdGastoRecurrente = getBody.data?.gastoRecurrente ?? getBody.data

      expect(createdGastoRecurrente.descripcion).toBe(gastoRecurrente.descripcion)
      expect(Number(createdGastoRecurrente.monto)).toBe(gastoRecurrente.monto)
      expect(createdGastoRecurrente.activo).toBe(true)
      expect(createdGastoRecurrente.frecuencia_gasto_id).toBe(gastoRecurrente.frecuencia_gasto_id)
    } finally {
      if (gastoRecurrenteId) {
        const deleteResponse = await gastosRecurrentesApi.delete(authSession.token, gastoRecurrenteId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
