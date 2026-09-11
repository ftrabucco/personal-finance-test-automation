import { test } from '@fixtures/test'

test.describe('Playwright agent seed @agent-seed', () => {
  test('authenticated user starts on dashboard', async ({ authenticatedPage, dashboardPage }) => {
    await authenticatedPage.goto('/')
    await dashboardPage.expectLoaded()
  })
})
