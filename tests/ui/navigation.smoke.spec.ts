import { test } from '@fixtures/test'

test.describe('Core navigation UI smoke @smoke @smoke-readonly @ui @navigation @P0', () => {
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    await authenticatedPage.goto('/')
    await dashboardPage.expectLoaded()
  })

  test('CF-EXP-READ-001 gastos page loads without mutations', async ({ gastosPage }) => {
    await gastosPage.goto()
    await gastosPage.expectLoaded()
  })

  test('CF-INC-READ-001 ingresos page loads without mutations', async ({ ingresosPage }) => {
    await ingresosPage.goto()
    await ingresosPage.expectLoaded()
  })

  test('CF-CONFIG-READ-001 configuracion page loads without mutations', async ({ configuracionPage }) => {
    await configuracionPage.goto()
    await configuracionPage.expectLoaded()
  })

  test('CF-PROFILE-READ-001 perfil page loads without mutations', async ({ perfilPage }) => {
    await perfilPage.goto()
    await perfilPage.expectLoaded()
  })
})
