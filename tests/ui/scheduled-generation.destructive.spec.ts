import { expect } from '@playwright/test'
import { test } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import { shiftedIsoDate, todayDayOfMonthBuenosAires } from '@utils/scheduledGeneration'
import type { CatalogosResponse, CatalogoItem } from '@api/catalogos.api'

function findFrecuencia(catalogosBody: CatalogosResponse, nombre: string): CatalogoItem | undefined {
  return catalogosBody.data?.frecuencias?.find(
    (frecuencia) => frecuencia.nombre_frecuencia?.toLowerCase() === nombre,
  )
}

function parseArsCurrency(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(normalized)
}

test.describe('Scheduled generation UI destructive @destructive @ui @dashboard @P2', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-GEN-005 reflects a scheduled-generated gasto recurrente in the dashboard monthly total', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    dashboardPage,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
    gastosApi,
    e2eContext,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    let gastoRecurrenteId: number | undefined
    let generatedGastoId: number | undefined

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]
      const frecuenciaMensual = findFrecuencia(catalogosBody, 'mensual')

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuenciaMensual, 'Expected a "Mensual" expense frequency in the catalog.')

      const montoRecurrente = 777
      const descripcion = e2eContext.entityName('Recurrente-Dashboard')
      const createResponse = await gastosRecurrentesApi.create(
        authSession.token,
        gastoRecurrenteBuilder
          .withDescripcion(descripcion)
          .withMonto(montoRecurrente)
          .withDiaDePago(todayDayOfMonthBuenosAires())
          .withFechaInicio(shiftedIsoDate(-30))
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
            frecuencia_gasto_id: frecuenciaMensual.id,
          })
          .build(),
      )
      const createBody = await expectSuccessfulResponse(createResponse)
      gastoRecurrenteId = createBody.data?.id ?? createBody.data?.gastoRecurrente?.id
      expect(gastoRecurrenteId).toBeTruthy()

      await authenticatedPage.goto('/')
      await dashboardPage.expectLoaded()
      await dashboardPage.expectMainFinancialCardsVisible()

      const gastosBefore = parseArsCurrency(await dashboardPage.getFinancialCardAmountTitle('Gastos del Mes'))

      // The mutation here is the scheduled-generation endpoint, not a direct
      // create — this is what CF-DASH-001 (manually-created gasto) doesn't
      // cover: does a *generated* gasto reach the dashboard the same way.
      const generateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(generateResponse)

      const matches = await gastosApi.findByDescription(authSession.token, descripcion)
      expect(matches, 'Expected the gasto recurrente to have generated its gasto').toHaveLength(1)
      generatedGastoId = matches[0].id

      await authenticatedPage.reload()
      await dashboardPage.expectLoaded()

      await expect
        .poll(async () => parseArsCurrency(await dashboardPage.getFinancialCardAmountTitle('Gastos del Mes')))
        .toBeCloseTo(gastosBefore + montoRecurrente, 2)
    } finally {
      if (generatedGastoId) {
        await gastosApi.delete(authSession.token, generatedGastoId)
      }
      if (gastoRecurrenteId) {
        await gastosRecurrentesApi.delete(authSession.token, gastoRecurrenteId)
      }
    }
  })
})
