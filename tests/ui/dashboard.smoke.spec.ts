import { test } from '@fixtures/test'
import { requireTestUser } from '@config/environment'

test.describe('Dashboard UI smoke @smoke @smoke-readonly @ui @dashboard @P1', () => {
  test('CF-DASH-001 dashboard renders main financial cards', async ({ loginPage, dashboardPage }) => {
    const user = requireTestUser()

    await loginPage.goto()
    await loginPage.login(user.email, user.password)

    await dashboardPage.expectLoaded()
    await dashboardPage.expectMainFinancialCardsVisible()
  })
})

