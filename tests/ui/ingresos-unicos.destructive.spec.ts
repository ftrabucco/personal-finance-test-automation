import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'
import type {
  IngresoUnicoListResponse,
  IngresoUnicoResponseItem,
  IngresosUnicosApiClient,
} from '@api/ingresos-unicos.api'

test.describe('Ingresos unicos UI destructive @destructive @ui @ingresos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-INC-001 creates, verifies and deletes an ingreso unico from UI', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
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
      .withDescripcion(`E2E-UI-Ingreso-Unico-${Date.now()}`)
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

      createdIds = await findIngresoIdsByDescription(
        ingresosUnicosApi,
        authSession.token,
        ingreso.descripcion,
      )
      expect(createdIds.length).toBeGreaterThan(0)

      await ingresosPage.deleteIngreso(ingreso.descripcion)
      await ingresosPage.expectIngresoNotVisible(ingreso.descripcion)

      createdIds = await findIngresoIdsByDescription(
        ingresosUnicosApi,
        authSession.token,
        ingreso.descripcion,
      )
      expect(createdIds).toHaveLength(0)
    } finally {
      for (const id of createdIds) {
        const deleteResponse = await ingresosUnicosApi.delete(authSession.token, id)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})

async function findIngresoIdsByDescription(
  ingresosUnicosApi: IngresosUnicosApiClient,
  token: string,
  descripcion: string,
) {
  const listResponse = await ingresosUnicosApi.list(token)
  const listBody = (await expectSuccessfulResponse(listResponse)) as IngresoUnicoListResponse

  return extractIngresos(listBody)
    .filter((ingreso) => ingreso.descripcion === descripcion)
    .map((ingreso) => ingreso.id)
}

function extractIngresos(body: IngresoUnicoListResponse): IngresoUnicoResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.ingresos ?? []
}
