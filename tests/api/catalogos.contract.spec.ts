import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Catalogos API contract @contract @api @catalogos @P0', () => {
  test('CF-CAT-001 returns core catalogs for authenticated user @smoke-readonly', async ({
    authSession,
    catalogosApi,
  }) => {
    const catalogosResponse = await catalogosApi.getAll(authSession.token)
    const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

    expect(catalogosBody.data?.categorias?.length).toBeGreaterThan(0)
    expect(catalogosBody.data?.importancias?.length).toBeGreaterThan(0)
    expect(catalogosBody.data?.tiposPago?.length).toBeGreaterThan(0)
    expect(catalogosBody.data?.fuentesIngreso?.length).toBeGreaterThan(0)
  })
})
