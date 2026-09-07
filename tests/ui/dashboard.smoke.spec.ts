import { test } from '@fixtures/test'

test.describe('Dashboard UI smoke @smoke @smoke-readonly @ui @dashboard @P1', () => {
  test('CF-DASH-001 dashboard renders main financial cards', async ({
    authenticatedPage,
    dashboardPage,
  }) => {
    await authenticatedPage.goto('/')
    await dashboardPage.expectLoaded()
    await dashboardPage.expectMainFinancialCardsVisible()
  })
})
