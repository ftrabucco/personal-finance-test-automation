import { test } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogoItem, CatalogosResponse } from '@api/catalogos.api'
import type { PreferenciasApiClient } from '@api/preferencias.api'

// Covers the "Dashboard: personalización" (CF-CONF-003) scenarios from
// docs/test-plans/dashboard-historial-test-plan.md, plus one representative
// check from "Dashboard: secciones configurables" (CF-DASH-001 extension).
//
// The plan proposes E2E checks for all 8 configurable sections (balance
// acumulado, tasa de ahorro, evolución mensual, ingresos vs gastos, gastos
// por categoría, desglose del mes, gastos recientes, proyección), but most
// of them only render amounts via `formatCurrencyCompact` with no `title`
// fallback for the full-precision value — unlike the 3 top summary cards,
// there's no reliable way to read an exact number back out of the DOM for
// most sections, and grouping/ranking checks (e.g. "ordena por subtotal
// descendente") would be fragile against this shared staging account's
// real, uncontrolled current-month data. "Gastos Recientes" is the one
// section where a presence check (not an amount/order check) is enough to
// protect a real regression risk: the frontend trusts the backend's /gastos
// order verbatim (no client-side re-sort — see `const gastos =
// gastosResponse?.data` in page.tsx), so a newly created expense not
// surfacing here would mean that ordering broke.
test.describe('Dashboard personalization and recent activity @destructive @ui @dashboard', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-CONF-003 hiding a dashboard section removes it, persists on reload, and reactivating restores it @P2', async ({
    authenticatedPage,
    authSession,
    dashboardPage,
    preferenciasApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const SECTION_KEY = 'tasa_ahorro'
    const SECTION_LABEL = 'Tasa de Ahorro'
    let originalSections: string[] | undefined

    try {
      originalSections = await ensureSectionActive(preferenciasApi, authSession.token, SECTION_KEY)

      await authenticatedPage.goto('/')
      await dashboardPage.expectLoaded()
      await dashboardPage.expectDashboardSectionVisible(SECTION_LABEL)

      // Scenario: hiding a section removes it from the dashboard.
      await dashboardPage.openPersonalizar()
      await dashboardPage.toggleDashboardSection(SECTION_LABEL)
      await dashboardPage.closePersonalizar()
      await dashboardPage.expectDashboardSectionNotVisible(SECTION_LABEL)

      // Scenario: the preference persists across a reload.
      await authenticatedPage.reload()
      await dashboardPage.expectLoaded()
      await dashboardPage.expectDashboardSectionNotVisible(SECTION_LABEL)

      // Scenario: reactivating shows it again (with a live render, not a
      // stale one left over from before it was hidden).
      await dashboardPage.openPersonalizar()
      await dashboardPage.toggleDashboardSection(SECTION_LABEL)
      await dashboardPage.closePersonalizar()
      await dashboardPage.expectDashboardSectionVisible(SECTION_LABEL)
    } finally {
      if (originalSections) {
        await expectSuccessfulResponse(
          await preferenciasApi.update(authSession.token, { dashboard_sections: originalSections }),
        )
      }
    }
  })

  test('CF-DASH-001 Gastos Recientes surfaces a newly created gasto @P2', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    dashboardPage,
    e2eContext,
    gastosUnicosApi,
    gastoUnicoBuilder,
    preferenciasApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    let originalSections: string[] | undefined
    let gastoId: number | undefined

    try {
      originalSections = await ensureSectionActive(preferenciasApi, authSession.token, 'gastos_recientes')

      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogos = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse
      const categoria = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected first gasto category.')
      const importancia = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected first gasto importance.')
      const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected first payment type.')

      const gasto = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Dashboard-Reciente'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
        })
        .build()

      const createResponse = await gastosUnicosApi.create(authSession.token, gasto)
      const body = await expectSuccessfulResponse(createResponse)
      gastoId = body.data?.id ?? body.data?.gasto?.id
      expectDefined(gastoId, 'Expected created gasto id.')

      await authenticatedPage.goto('/')
      await dashboardPage.expectLoaded()
      await dashboardPage.expectRecentExpenseVisible(gasto.descripcion)
    } finally {
      if (gastoId) {
        await expectSuccessfulResponse(await gastosUnicosApi.delete(authSession.token, gastoId))
      }
      if (originalSections) {
        await expectSuccessfulResponse(
          await preferenciasApi.update(authSession.token, { dashboard_sections: originalSections }),
        )
      }
    }
  })
})

/**
 * Reads the account's current `dashboard_sections`, activates `sectionKey`
 * if it isn't already, and returns the *original* list so the caller can
 * restore it verbatim in a `finally` block — this account is shared with
 * other test runs and real usage, so personalization state must not leak.
 */
async function ensureSectionActive(preferenciasApi: PreferenciasApiClient, token: string, sectionKey: string) {
  const response = await preferenciasApi.get(token)
  const body = await expectSuccessfulResponse(response)
  const originalSections = body.data?.dashboard_sections
  expectDefined(originalSections, 'Expected existing dashboard_sections preference.')

  if (!originalSections.includes(sectionKey)) {
    await expectSuccessfulResponse(
      await preferenciasApi.update(token, { dashboard_sections: [...originalSections, sectionKey] }),
    )
  }

  return originalSections
}

function expectCatalogo(item: CatalogoItem | undefined, message: string) {
  expectDefined(item, message)

  return item
}
