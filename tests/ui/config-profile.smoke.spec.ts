import { test } from '@fixtures/test'

test.describe('Configuration and profile UI smoke @smoke @smoke-readonly @ui @settings @P1', () => {
  test.beforeEach(async ({ authenticatedPage, dashboardPage }) => {
    await authenticatedPage.goto('/')
    await dashboardPage.expectLoaded()
  })

  test('CF-CONFIG-READ-002 configuracion displays module state without mutations', async ({
    configuracionPage,
  }) => {
    await configuracionPage.goto()
    await configuracionPage.expectLoaded()
    await configuracionPage.openModulosTab()

    await configuracionPage.expectModuleStateVisible()
  })

  test('CF-PROFILE-READ-002 perfil displays account data', async ({
    authSession,
    perfilPage,
  }) => {
    await perfilPage.goto()
    await perfilPage.expectLoaded()

    await perfilPage.expectAccountData(authSession.user)
  })

  test('CF-PROFILE-READ-003 perfil password form starts empty and disabled', async ({
    perfilPage,
  }) => {
    await perfilPage.goto()
    await perfilPage.expectLoaded()

    await perfilPage.expectPasswordSectionReadOnlyInitialState()
  })
})
