import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Ingresos unicos UI destructive @destructive @ui @ingresos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-INC-001 creates, verifies and deletes an ingreso unico from UI', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    e2eContext,
    ingresosUnicosApi,
    ingresoUnicoBuilder,
    ingresosPage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const catalogosResponse = await catalogosApi.getAll(authSession.token)
    const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

    const fuenteIngreso = catalogosBody.data?.fuentesIngreso?.[0]

    expect(fuenteIngreso?.id).toBeTruthy()
    expect(fuenteIngreso?.nombre).toBeTruthy()

    const ingreso = ingresoUnicoBuilder
      .withDescripcion(e2eContext.entityName('Ingreso-Unico-UI'))
      .withFuenteIngresoId(fuenteIngreso!.id)
      .build()

    let createdIds: number[] = []

    try {
      await authenticatedPage.goto('/')
      await ingresosPage.gotoUnicos()
      await ingresosPage.expectLoaded()
      await ingresosPage.openNewIngresoUnicoDialog()

      await ingresosPage.createIngresoUnico(ingreso, {
        fuenteIngreso: fuenteIngreso!.nombre!,
      })

      await ingresosPage.expectIngresoVisible(ingreso.descripcion)

      createdIds = await ingresosUnicosApi.findIdsByDescription(authSession.token, ingreso.descripcion)
      expect(createdIds.length).toBeGreaterThan(0)

      await ingresosPage.deleteIngreso(ingreso.descripcion)
      await ingresosPage.expectIngresoNotVisible(ingreso.descripcion)

      createdIds = await ingresosUnicosApi.findIdsByDescription(authSession.token, ingreso.descripcion)
      expect(createdIds).toHaveLength(0)
    } finally {
      const deleteResponses = await ingresosUnicosApi.deleteMany(authSession.token, createdIds)

      for (const deleteResponse of deleteResponses) {
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
