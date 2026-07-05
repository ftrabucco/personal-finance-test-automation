import { test, expect } from '@fixtures/test'
import { requireTestUser } from '@config/environment'

test.describe('Auth UI smoke @smoke @smoke-readonly @ui @auth @P0', () => {
  test('CF-AUTH-001 user can login and reach dashboard', async ({ page, loginPage, dashboardPage }) => {
    const user = requireTestUser()

    await loginPage.goto()
    await loginPage.expectLoaded()
    await loginPage.login(user.email, user.password)

    await expect(page).toHaveURL('/')
    await dashboardPage.expectLoaded()
  })

  test('CF-AUTH-002 unauthenticated user is redirected to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/')

    await expect(page).toHaveURL(/\/login/)
  })
})

