import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'
import type {
  GastoUnicoListResponse,
  GastoUnicoResponseItem,
  GastosUnicosApiClient,
} from '@api/gastos-unicos.api'

test.describe('Gastos unicos UI destructive @destructive @ui @gastos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-001 creates, verifies and deletes a gasto unico from UI', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    gastosUnicosApi,
    gastoUnicoBuilder,
    gastosPage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const catalogosResponse = await catalogosApi.getAll(authSession.token)
    const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

    const categoria = catalogosBody.data?.categorias?.[0]
    const importancia = catalogosBody.data?.importancias?.[0]
    const tipoPago = catalogosBody.data?.tiposPago?.[0]

    expect(categoria?.id).toBeTruthy()
    expect(importancia?.id).toBeTruthy()
    expect(tipoPago?.id).toBeTruthy()
    const categoriaNombre = categoria?.nombre ?? categoria?.nombre_categoria
    const importanciaNombre = importancia?.nombre ?? importancia?.nombre_importancia
    const tipoPagoNombre = tipoPago?.nombre

    expect(categoriaNombre).toBeTruthy()
    expect(importanciaNombre).toBeTruthy()
    expect(tipoPagoNombre).toBeTruthy()

    const gasto = gastoUnicoBuilder
      .withDescripcion(`E2E-UI-Gasto-Unico-${Date.now()}`)
      .withCatalogos({
        categoria_gasto_id: categoria!.id,
        importancia_gasto_id: importancia!.id,
        tipo_pago_id: tipoPago!.id,
      })
      .build()

    let createdIds: number[] = []

    try {
      await authenticatedPage.goto('/')
      await gastosPage.gotoUnicos()
      await gastosPage.expectLoaded()
      await gastosPage.openNewGastoUnicoDialog()

      await gastosPage.createGastoUnico(gasto, {
        categoria: categoriaNombre!,
        importancia: importanciaNombre!,
        tipoPago: tipoPagoNombre!,
      })

      await gastosPage.expectGastoVisible(gasto.descripcion)

      createdIds = await findGastoIdsByDescription(
        gastosUnicosApi,
        authSession.token,
        gasto.descripcion,
      )
      expect(createdIds.length).toBeGreaterThan(0)

      await gastosPage.deleteGasto(gasto.descripcion)
      await gastosPage.expectGastoNotVisible(gasto.descripcion)

      createdIds = await findGastoIdsByDescription(
        gastosUnicosApi,
        authSession.token,
        gasto.descripcion,
      )
      expect(createdIds).toHaveLength(0)
    } finally {
      for (const id of createdIds) {
        const deleteResponse = await gastosUnicosApi.delete(authSession.token, id)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})

async function findGastoIdsByDescription(
  gastosUnicosApi: GastosUnicosApiClient,
  token: string,
  descripcion: string,
) {
  const listResponse = await gastosUnicosApi.list(token)
  const listBody = (await expectSuccessfulResponse(listResponse)) as GastoUnicoListResponse

  return extractGastos(listBody)
    .filter((gasto) => gasto.descripcion === descripcion)
    .map((gasto) => gasto.id)
}

function extractGastos(body: GastoUnicoListResponse) {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.gastos ?? []
}
