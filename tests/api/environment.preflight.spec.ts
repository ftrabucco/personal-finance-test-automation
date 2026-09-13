import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { getEnvironmentConfig } from '@config/environment'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Staging environment preflight @preflight @api @environment @P1', () => {
  test('ENV-STG-001 validates staging is ready for destructive tests', async ({
    request,
    authSession,
    catalogosApi,
  }) => {
    const env = getEnvironmentConfig()

    expect(env.name).toBe('staging')
    expect(env.allowDestructiveTests).toBe(true)
    expect(env.baseUrl).toContain('staging')
    expect(env.apiUrl).toContain('api-test')
    expect(env.user.email).toBeTruthy()
    expect(env.user.password).toBeTruthy()

    const apiHealthUrl = new URL(env.apiUrl)
    apiHealthUrl.pathname = '/health'
    apiHealthUrl.search = ''

    const apiHealthResponse = await request.get(apiHealthUrl.toString())
    expect(apiHealthResponse.ok(), await apiHealthResponse.text()).toBeTruthy()

    const apiHealthBody = await apiHealthResponse.json()
    expect(apiHealthBody.status).toBe('ok')

    const frontendResponse = await request.get(env.baseUrl)
    expect(frontendResponse.ok(), await frontendResponse.text()).toBeTruthy()

    expect(authSession.token).toBeTruthy()
    expect(authSession.user.email).toBe(env.user.email)

    const catalogosResponse = await catalogosApi.getAll(authSession.token)
    const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

    expect(catalogosBody.data?.categorias?.length).toBeGreaterThan(0)
    expect(catalogosBody.data?.importancias?.length).toBeGreaterThan(0)
    expect(catalogosBody.data?.tiposPago?.length).toBeGreaterThan(0)
    expect(catalogosBody.data?.fuentesIngreso?.length).toBeGreaterThan(0)
  })
})
