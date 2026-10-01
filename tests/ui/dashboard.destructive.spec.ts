import { expect } from '@playwright/test'
import { test } from '@fixtures/test'
import { expectSuccessfulResponse, expectSuccessfulResponses } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'

test.describe('Dashboard UI destructive @destructive @ui @dashboard @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  // The dashboard's gastos/ingresos queries now poll every 30s in the
  // background (see the refetchInterval fix for the stale-cache bug this
  // file's CF-DASH-002 covers). Running this file's tests in parallel lets
  // one test's created gasto/ingreso leak into another test's poll window
  // against the same shared account. `serial` keeps them from overlapping
  // regardless of the run's --workers setting.
  test.describe.configure({ mode: 'serial' })

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

  test('CF-DASH-002 reflects an expense and an income created via direct API without a manual reload', async ({
    authenticatedPage,
    authSession,
    dashboardPage,
    financeTestDataFactory,
    gastosUnicosApi,
    ingresosUnicosApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    // Each expect.poll below allows up to 40s (longer than the 30s
    // refetchInterval), but the default *test* timeout (playwright.config.ts)
    // is only 30s and overrides everything inside it, including per-assertion
    // poll timeouts. Without raising it here, this test always times out
    // before any poll gets its full window — passed locally only because
    // local latency left enough slack under 30s; failed consistently against
    // staging's extra network latency. The three polls run sequentially and
    // may each need close to their full window if the three hooks' 30s
    // intervals aren't in sync, so budget generously rather than tightly.
    test.setTimeout(120_000)

    const gastoAmount = 4321
    const ingresoAmount = 8765
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
      const balanceBefore = parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Balance Neto'),
      )

      // Created via direct API calls, not through the frontend's own
      // create-gasto/create-ingreso mutations — this is what distinguishes
      // this test from CF-DASH-001. It stands in for any data change that
      // doesn't originate from a UI action in this same tab: the backend's
      // automatic expense-generation scheduler, another browser tab,
      // another device on the same account.
      const gastoResponse = await gastosUnicosApi.create(authSession.token, gasto)
      const gastoBody = await expectSuccessfulResponse(gastoResponse)
      gastoId = gastoBody.data?.id ?? gastoBody.data?.gasto?.id

      const ingresoResponse = await ingresosUnicosApi.create(authSession.token, ingreso)
      const ingresoBody = await expectSuccessfulResponse(ingresoResponse)
      ingresoId = ingresoBody.data?.id ?? ingresoBody.data?.ingreso?.id

      // No reload here on purpose: a dashboard that's actually "live"
      // should pick this up on its own within a few seconds, same as it
      // does for data created through its own UI (CF-DASH-001).
      await expect.poll(async () => parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Gastos del Mes'),
      ), { timeout: 40_000 }).toBeCloseTo(gastosBefore + gastoAmount, 2)

      await expect.poll(async () => parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Ingresos del Mes'),
      ), { timeout: 40_000 }).toBeCloseTo(ingresosBefore + ingresoAmount, 2)

      await expect.poll(async () => parseArsCurrency(
        await dashboardPage.getFinancialCardAmountTitle('Balance Neto'),
      ), { timeout: 40_000 }).toBeCloseTo(balanceBefore + ingresoAmount - gastoAmount, 2)
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
