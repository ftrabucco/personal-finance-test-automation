import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import { monthsAgoIsoDate, regularInstallmentDate } from '@utils/scheduledGeneration'
import type { CatalogosResponse } from '@api/catalogos.api'
import type { GeneratePendingResponse } from '@api/gastos.api'

test.describe('Scheduled generation API destructive @destructive @api @gastos @compras @P2', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-GEN-001 catches up all missed installments in one run, using their real target dates', async ({
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let compraId: number | undefined
    const generatedGastoIds: number[] = []

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')

      // Backdated 3 months, fixed on day 1 so every expected cuota date lands on
      // a day that exists in every month (no clamping) and is always <= today,
      // regardless of what day of the real month this test happens to run on.
      const cantidadCuotas = 4
      const fechaCompra = monthsAgoIsoDate(3, 1)
      const descripcion = e2eContext.entityName('Compra-Catchup')

      const compra = compraBuilder
        .withDescripcion(descripcion)
        .withMontoTotal(4000)
        .withCantidadCuotas(cantidadCuotas)
        .withFechaCompra(fechaCompra)
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
        })
        .build()

      const createResponse = await comprasApi.create(authSession.token, compra)
      const createBody = await expectSuccessfulResponse(createResponse)
      const createdCompra = createBody.data?.compra ?? createBody.data
      compraId = createdCompra?.id
      expect(compraId).toBeTruthy()

      // The backend does not necessarily round-trip fecha_compra unchanged
      // (known off-by-one-day quirk, tracked separately). Base every expected
      // cuota date on what the backend actually stored, not on what was sent,
      // so this test verifies catch-up date math rather than that quirk.
      const storedFechaCompra: string = createdCompra.fecha_compra

      // Regression coverage: before the fix, the backend stamped
      // fecha_ultima_cuota_generada with "today" instead of the cuota's real
      // target date. That made the "already generated this month" guard trip
      // after the very first catch-up cuota, capping catch-up at one cuota per
      // real calendar month no matter how many were actually missed. Calling
      // /gastos/generate repeatedly, on the same real day, must now produce one
      // new cuota per call until every missed installment is caught up.
      for (let cuotaNumero1Based = 1; cuotaNumero1Based <= cantidadCuotas; cuotaNumero1Based++) {
        const generateResponse = await gastosApi.generatePending(authSession.token)
        const generateBody = (await expectSuccessfulResponse(generateResponse)) as GeneratePendingResponse
        expect(generateBody.data?.summary.breakdown.compras).toBeGreaterThanOrEqual(1)

        const expectedDescripcion = `${descripcion} - Cuota ${cuotaNumero1Based}/${cantidadCuotas}`
        const expectedFecha = regularInstallmentDate(storedFechaCompra, cuotaNumero1Based - 1)

        const matches = await gastosApi.findByDescription(authSession.token, expectedDescripcion)
        expect(matches, `Expected cuota ${cuotaNumero1Based}/${cantidadCuotas} after generate() call #${cuotaNumero1Based}`).toHaveLength(1)
        expect(matches[0].fecha).toBe(expectedFecha)

        generatedGastoIds.push(matches[0].id)
      }

      const compraAfterCatchUp = await comprasApi.getById(authSession.token, compraId!)
      const compraAfterCatchUpBody = await expectSuccessfulResponse(compraAfterCatchUp)
      const compraState = compraAfterCatchUpBody.data?.compra ?? compraAfterCatchUpBody.data
      expect(compraState.pendiente_cuotas).toBe(false)
      expect(compraState.fecha_ultima_cuota_generada).toBe(regularInstallmentDate(storedFechaCompra, cantidadCuotas - 1))

      // Duplicate prevention: the compra is fully generated, a further manual
      // run must not create a 5th gasto for it.
      const extraGenerateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(extraGenerateResponse)

      const allCuotas = await Promise.all(
        Array.from({ length: cantidadCuotas }, (_, index) =>
          gastosApi.findByDescription(authSession.token, `${descripcion} - Cuota ${index + 1}/${cantidadCuotas}`),
        ),
      )
      for (const match of allCuotas) {
        expect(match).toHaveLength(1)
      }
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (compraId) {
        const deleteResponse = await comprasApi.delete(authSession.token, compraId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
