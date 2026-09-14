import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Compras API destructive @destructive @api @gastos @compras @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-003 creates, verifies and cleans up a compra en cuotas definition', async ({
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let compraId: number | undefined

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')

      const compra = compraBuilder
        .withDescripcion(e2eContext.entityName('Compra-API'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
        })
        .build()

      const createResponse = await comprasApi.create(authSession.token, compra)
      const createBody = await expectSuccessfulResponse(createResponse)
      compraId = createBody.data?.id ?? createBody.data?.compra?.id

      expect(compraId).toBeTruthy()

      const getResponse = await comprasApi.getById(authSession.token, compraId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdCompra = getBody.data?.compra ?? getBody.data

      expect(createdCompra.descripcion).toBe(compra.descripcion)
      expect(Number(createdCompra.monto_total)).toBe(compra.monto_total)
      expect(createdCompra.cantidad_cuotas).toBe(compra.cantidad_cuotas)
      expect(createdCompra.categoria_gasto_id).toBe(compra.categoria_gasto_id)
      expect(createdCompra.pendiente_cuotas).toBe(true)
    } finally {
      if (compraId) {
        const deleteResponse = await comprasApi.delete(authSession.token, compraId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
