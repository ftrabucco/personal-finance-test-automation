import { expect } from '@playwright/test'
import { test } from '@fixtures/test'
import { expectSuccessfulResponse, expectSuccessfulResponses } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'

test.describe('Dashboard UI destructive @destructive @ui @dashboard @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-DASH-001 reflects API-created expense and income in monthly totals', async ({
    authenticatedPage,
    authSession,
    dashboardPage,
    financeTestDataFactory,
    gastosUnicosApi,
    ingresosUnicosApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const gastoAmount = 321
    const ingresoAmount = 654
    const { payload: gastoBase } = await financeTestDataFactory.gastoUnicoForUi(authSession.token)
    const { payload: ingresoBase } = await financeTestDataFactory.ingresoUnicoForUi(authSession.token)
    const gasto = { ...gastoBase, monto: gastoAmount }
    const ingreso = { ...ingresoBase, monto: ingresoAmount }
    let gastoId: number | undefined
    let ingresoId: number | undefined

    try {
      await authenticatedPage.goto('/')
      await dashboardPage.expectLoaded()
      await dashboardPage.expectMainFinancialCardsVisible()

      const gastosBefore = parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Gastos del Mes'),
      )
      const ingresosBefore = parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Ingresos del Mes'),
      )

      const gastoResponse = await gastosUnicosApi.create(authSession.token, gasto)
      const gastoBody = await expectSuccessfulResponse(gastoResponse)
      gastoId = gastoBody.data?.id ?? gastoBody.data?.gasto?.id

      const ingresoResponse = await ingresosUnicosApi.create(authSession.token, ingreso)
      const ingresoBody = await expectSuccessfulResponse(ingresoResponse)
      ingresoId = ingresoBody.data?.id ?? ingresoBody.data?.ingreso?.id

      await authenticatedPage.reload()
      await dashboardPage.expectLoaded()

      await expect.poll(async () => parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Gastos del Mes'),
      )).toBeCloseTo(gastosBefore + gastoAmount, 2)

      await expect.poll(async () => parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Ingresos del Mes'),
      )).toBeCloseTo(ingresosBefore + ingresoAmount, 2)
    } finally {
      const deleteResponses = await Promise.all([
        gastoId ? gastosUnicosApi.delete(authSession.token, gastoId) : undefined,
        ingresoId ? ingresosUnicosApi.delete(authSession.token, ingresoId) : undefined,
      ])
      await expectSuccessfulResponses(deleteResponses.filter((response) => response !== undefined))
    }
  })
})

function parseArsCurrency(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(normalized)
}
