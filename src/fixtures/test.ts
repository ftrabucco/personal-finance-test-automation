import { request as playwrightRequest, test as base, type Page } from '@playwright/test'
import { AuthApiClient } from '@api/auth.api'
import { CatalogosApiClient } from '@api/catalogos.api'
import { ComprasApiClient } from '@api/compras.api'
import { DebitosAutomaticosApiClient } from '@api/debitos-automaticos.api'
import { GastosApiClient } from '@api/gastos.api'
import { GastosRecurrentesApiClient } from '@api/gastos-recurrentes.api'
import { GastosUnicosApiClient } from '@api/gastos-unicos.api'
import { IngresosUnicosApiClient } from '@api/ingresos-unicos.api'
import { ProtectedResourcesApiClient } from '@api/protected-resources.api'
import { CompraBuilder } from '@builders/CompraBuilder'
import { DebitoAutomaticoBuilder } from '@builders/DebitoAutomaticoBuilder'
import { GastoRecurrenteBuilder } from '@builders/GastoRecurrenteBuilder'
import { GastoUnicoBuilder } from '@builders/GastoUnicoBuilder'
import { IngresoUnicoBuilder } from '@builders/IngresoUnicoBuilder'
import { getEnvironmentConfig, requireTestUser } from '@config/environment'
import { FinanceTestDataFactory } from '@factories/FinanceTestDataFactory'
import { LoginPage } from '@pages/LoginPage'
import { DashboardPage } from '@pages/DashboardPage'
import { GastosPage } from '@pages/GastosPage'
import { IngresosPage } from '@pages/IngresosPage'
import { ConfiguracionPage } from '@pages/ConfiguracionPage'
import { PerfilPage } from '@pages/PerfilPage'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import type { LoginResponse } from '@api/auth.api'
import {
  buildE2EHeaders,
  createE2ETestContext,
  getTestRunId,
  type E2ETestContext,
} from '@utils/e2eObservability'

type AuthSession = {
  token: string
  user: {
    id: number
    nombre: string
    email: string
  }
}

type AppFixtures = {
  e2eContext: E2ETestContext
  authApi: AuthApiClient
  catalogosApi: CatalogosApiClient
  comprasApi: ComprasApiClient
  debitosAutomaticosApi: DebitosAutomaticosApiClient
  gastosApi: GastosApiClient
  gastosRecurrentesApi: GastosRecurrentesApiClient
  gastosUnicosApi: GastosUnicosApiClient
  ingresosUnicosApi: IngresosUnicosApiClient
  protectedResourcesApi: ProtectedResourcesApiClient
  compraBuilder: CompraBuilder
  debitoAutomaticoBuilder: DebitoAutomaticoBuilder
  gastoRecurrenteBuilder: GastoRecurrenteBuilder
  gastoUnicoBuilder: GastoUnicoBuilder
  ingresoUnicoBuilder: IngresoUnicoBuilder
  financeTestDataFactory: FinanceTestDataFactory
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
  e2eContext: async ({}, use, testInfo) => {
    const context = createE2ETestContext(testInfo)

    testInfo.annotations.push(
      { type: 'e2e:testRunId', description: context.testRunId },
      { type: 'e2e:correlationId', description: context.correlationId },
      { type: 'e2e:flowId', description: context.flowId },
    )
    await testInfo.attach('e2e-metadata', {
      body: JSON.stringify(context, null, 2),
      contentType: 'application/json',
    })

    await use(context)
  },

  page: async ({ page, e2eContext }, use) => {
    await page.context().setExtraHTTPHeaders(buildE2EHeaders(e2eContext))
    await use(page)
  },

  authApi: async ({ request, e2eContext }, use) => {
    await use(new AuthApiClient(request, e2eContext))
  },

  catalogosApi: async ({ request, e2eContext }, use) => {
    await use(new CatalogosApiClient(request, e2eContext))
  },

  comprasApi: async ({ request, e2eContext }, use) => {
    await use(new ComprasApiClient(request, e2eContext))
  },

  debitosAutomaticosApi: async ({ request, e2eContext }, use) => {
    await use(new DebitosAutomaticosApiClient(request, e2eContext))
  },

  gastosApi: async ({ request, e2eContext }, use) => {
    await use(new GastosApiClient(request, e2eContext))
  },

  gastosRecurrentesApi: async ({ request, e2eContext }, use) => {
    await use(new GastosRecurrentesApiClient(request, e2eContext))
  },

  gastosUnicosApi: async ({ request, e2eContext }, use) => {
    await use(new GastosUnicosApiClient(request, e2eContext))
  },

  ingresosUnicosApi: async ({ request, e2eContext }, use) => {
    await use(new IngresosUnicosApiClient(request, e2eContext))
  },

  protectedResourcesApi: async ({ request, e2eContext }, use) => {
    await use(new ProtectedResourcesApiClient(request, e2eContext))
  },

  compraBuilder: async ({}, use) => {
    await use(new CompraBuilder())
  },

  debitoAutomaticoBuilder: async ({}, use) => {
    await use(new DebitoAutomaticoBuilder())
  },

  gastoRecurrenteBuilder: async ({}, use) => {
    await use(new GastoRecurrenteBuilder())
  },

  gastoUnicoBuilder: async ({}, use) => {
    await use(new GastoUnicoBuilder())
  },

  ingresoUnicoBuilder: async ({}, use) => {
    await use(new IngresoUnicoBuilder())
  },

  financeTestDataFactory: async ({
    catalogosApi,
    gastoUnicoBuilder,
    ingresoUnicoBuilder,
    e2eContext,
  }, use) => {
    await use(new FinanceTestDataFactory(
      catalogosApi,
      gastoUnicoBuilder,
      ingresoUnicoBuilder,
      e2eContext,
    ))
  },

  workerAuthSession: [
    async ({}, use) => {
      const env = getEnvironmentConfig()
      const user = requireTestUser()
      const request = await playwrightRequest.newContext()
      const response = await request.post(`${env.apiUrl}/auth/login`, {
        headers: {
          'x-e2e-test-run-id': getTestRunId(),
        },
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
