import { test as base } from '@playwright/test'
import { AuthApiClient } from '@api/auth.api'
import { LoginPage } from '@pages/LoginPage'
import { DashboardPage } from '@pages/DashboardPage'

type AppFixtures = {
  authApi: AuthApiClient
  loginPage: LoginPage
  dashboardPage: DashboardPage
}

export const test = base.extend<AppFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApiClient(request))
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },
})

export { expect } from '@playwright/test'

