import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Debitos automaticos API destructive @destructive @api @gastos @debitos @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-002 creates, verifies and cleans up a debito automatico definition', async ({
    authSession,
    catalogosApi,
    debitosAutomaticosApi,
    debitoAutomaticoBuilder,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let debitoAutomaticoId: number | undefined

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

      const debitoAutomatico = debitoAutomaticoBuilder
        .withDescripcion(e2eContext.entityName('Debito-Automatico-API'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
          frecuencia_gasto_id: frecuencia.id,
        })
        .build()

      const createResponse = await debitosAutomaticosApi.create(authSession.token, debitoAutomatico)
      const createBody = await expectSuccessfulResponse(createResponse)
      debitoAutomaticoId = createBody.data?.id ?? createBody.data?.debitoAutomatico?.id

      expect(debitoAutomaticoId).toBeTruthy()

      const getResponse = await debitosAutomaticosApi.getById(authSession.token, debitoAutomaticoId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdDebitoAutomatico = getBody.data?.debitoAutomatico ?? getBody.data

      expect(createdDebitoAutomatico.descripcion).toBe(debitoAutomatico.descripcion)
      expect(Number(createdDebitoAutomatico.monto)).toBe(debitoAutomatico.monto)
      expect(createdDebitoAutomatico.activo).toBe(true)
      expect(createdDebitoAutomatico.frecuencia_gasto_id).toBe(debitoAutomatico.frecuencia_gasto_id)
      expect(createdDebitoAutomatico.usa_vencimiento_tarjeta).toBe(false)
    } finally {
      if (debitoAutomaticoId) {
        const deleteResponse = await debitosAutomaticosApi.delete(authSession.token, debitoAutomaticoId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
