import { request as playwrightRequest, test as base, type Page } from '@playwright/test'
import { AuthApiClient } from '@api/auth.api'
import { CatalogosApiClient } from '@api/catalogos.api'
import { GastosUnicosApiClient } from '@api/gastos-unicos.api'
import { IngresosUnicosApiClient } from '@api/ingresos-unicos.api'
import { GastoUnicoBuilder } from '@builders/GastoUnicoBuilder'
import { IngresoUnicoBuilder } from '@builders/IngresoUnicoBuilder'
import { getEnvironmentConfig, requireTestUser } from '@config/environment'
import { LoginPage } from '@pages/LoginPage'
import { DashboardPage } from '@pages/DashboardPage'
import { GastosPage } from '@pages/GastosPage'
import { IngresosPage } from '@pages/IngresosPage'
import { ConfiguracionPage } from '@pages/ConfiguracionPage'
import { PerfilPage } from '@pages/PerfilPage'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import type { LoginResponse } from '@api/auth.api'

type AuthSession = {
  token: string
  user: {
    id: number
    nombre: string
    email: string
  }
}

type AppFixtures = {
  authApi: AuthApiClient
  catalogosApi: CatalogosApiClient
  gastosUnicosApi: GastosUnicosApiClient
  ingresosUnicosApi: IngresosUnicosApiClient
  gastoUnicoBuilder: GastoUnicoBuilder
  ingresoUnicoBuilder: IngresoUnicoBuilder
  authSession: AuthSession
  authenticatedPage: Page
  loginPage: LoginPage
  dashboardPage: DashboardPage
  gastosPage: GastosPage
  ingresosPage: IngresosPage
  configuracionPage: ConfiguracionPage
  perfilPage: PerfilPage
}

type WorkerFixtures = {
  workerAuthSession: AuthSession
}

export const test = base.extend<AppFixtures, WorkerFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApiClient(request))
  },

  catalogosApi: async ({ request }, use) => {
    await use(new CatalogosApiClient(request))
  },

  gastosUnicosApi: async ({ request }, use) => {
    await use(new GastosUnicosApiClient(request))
  },

  ingresosUnicosApi: async ({ request }, use) => {
    await use(new IngresosUnicosApiClient(request))
  },

  gastoUnicoBuilder: async ({}, use) => {
    await use(new GastoUnicoBuilder())
  },

  ingresoUnicoBuilder: async ({}, use) => {
    await use(new IngresoUnicoBuilder())
  },

  workerAuthSession: [
    async ({}, use) => {
      const env = getEnvironmentConfig()
      const user = requireTestUser()
      const request = await playwrightRequest.newContext()
      const response = await request.post(`${env.apiUrl}/auth/login`, {
        data: {
          email: user.email,
          password: user.password,
        },
      })
      const body = (await expectSuccessfulResponse(response)) as LoginResponse
      const token = body.data?.token
      const loggedUser = body.data?.user

      if (!token || !loggedUser) {
        throw new Error('Login did not return token and user.')
      }

      await use({
        token,
        user: loggedUser,
      })

      await request.dispose()
    },
    { scope: 'worker' },
  ],

  authSession: async ({ workerAuthSession }, use) => {
    await use(workerAuthSession)
  },

  authenticatedPage: async ({ page, workerAuthSession }, use) => {
    const env = getEnvironmentConfig()
    const baseUrl = new URL(env.baseUrl)

    await page.context().addCookies([
      {
        name: 'token',
        value: workerAuthSession.token,
        domain: baseUrl.hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        httpOnly: false,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem('token', token)
        window.localStorage.setItem('user', JSON.stringify(user))
      },
      {
        token: workerAuthSession.token,
        user: workerAuthSession.user,
      },
    )

    await use(page)
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },

  gastosPage: async ({ page }, use) => {
    await use(new GastosPage(page))
  },

  ingresosPage: async ({ page }, use) => {
    await use(new IngresosPage(page))
  },

  configuracionPage: async ({ page }, use) => {
    await use(new ConfiguracionPage(page))
  },

  perfilPage: async ({ page }, use) => {
    await use(new PerfilPage(page))
  },
})

export { expect } from '@playwright/test'
