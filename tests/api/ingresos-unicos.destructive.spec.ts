import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Ingresos unicos API destructive @destructive @api @ingresos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-INC-001 creates, verifies and cleans up an ingreso unico', async ({
    authSession,
    catalogosApi,
    e2eContext,
    ingresosUnicosApi,
    ingresoUnicoBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    let ingresoId: number | undefined

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse
      const fuenteIngreso = catalogosBody.data?.fuentesIngreso?.[0]

      expect(fuenteIngreso?.id).toBeTruthy()

      const ingreso = ingresoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Ingreso-Unico-API'))
        .withFuenteIngresoId(fuenteIngreso!.id)
        .build()

      const createResponse = await ingresosUnicosApi.create(authSession.token, ingreso)
      const createBody = await expectSuccessfulResponse(createResponse)
      ingresoId = createBody.data?.id ?? createBody.data?.ingreso?.id

      expect(ingresoId).toBeTruthy()

      const getResponse = await ingresosUnicosApi.getById(authSession.token, ingresoId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdIngreso = getBody.data?.ingreso ?? getBody.data

      expect(createdIngreso.descripcion).toBe(ingreso.descripcion)
      expect(Number(createdIngreso.monto)).toBe(ingreso.monto)
    } finally {
      if (ingresoId) {
        const deleteResponse = await ingresosUnicosApi.delete(authSession.token, ingresoId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
