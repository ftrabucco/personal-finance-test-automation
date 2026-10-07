import { test } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse, expectSuccessfulResponses } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogoItem, CatalogosApiClient, CatalogosResponse } from '@api/catalogos.api'

test.describe('Unique transaction filters UI destructive @destructive @ui @filters', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-005 filters gastos unicos by category and date from UI @P1', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    e2eContext,
    gastosUnicosApi,
    gastoUnicoBuilder,
    gastosPage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []
    const targetDate = isoDateDaysAgo(1)
    const outsideDate = isoDateDaysAgo(45)

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const categoria = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected first gasto category.')
      const otherCategoria = expectCatalogo(catalogos.data?.categorias?.[1], 'Expected second gasto category.')
      const importancia = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected first gasto importance.')
      const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected first payment type.')

      const matchingGasto = {
        ...gastoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Gasto-UI-Filtro-Match'))
          .withFecha(targetDate)
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build(),
      }

      const outsideDateGasto = {
        ...gastoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Gasto-UI-Filtro-Outside-Date'))
          .withFecha(outsideDate)
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build(),
      }

      const outsideCategoryGasto = {
        ...gastoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Gasto-UI-Filtro-Outside-Category'))
          .withFecha(targetDate)
          .withCatalogos({
            categoria_gasto_id: otherCategoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build(),
      }

      for (const gasto of [matchingGasto, outsideDateGasto, outsideCategoryGasto]) {
        const response = await gastosUnicosApi.create(authSession.token, gasto)
        const body = await expectSuccessfulResponse(response)
        const id = body.data?.id ?? body.data?.gasto?.id
        expectDefined(id, `Expected created gasto id for ${gasto.descripcion}`)
        createdIds.push(id)
      }

      await authenticatedPage.goto('/')
      await gastosPage.gotoUnicos()
      await gastosPage.expectLoaded()
      await gastosPage.expectGastoVisible(matchingGasto.descripcion)
      await gastosPage.expectGastoVisible(outsideCategoryGasto.descripcion)

      await gastosPage.openFilters()
      await gastosPage.filterGastosUnicosByCategoria(catalogoName(categoria, ['nombre', 'nombre_categoria']))
      await gastosPage.filterGastosUnicosByDateRange(targetDate, targetDate)

      await gastosPage.expectGastoVisible(matchingGasto.descripcion)
      await gastosPage.expectGastoNotVisible(outsideDateGasto.descripcion)
      await gastosPage.expectGastoNotVisible(outsideCategoryGasto.descripcion)
    } finally {
      const deleteResponses = await gastosUnicosApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })

  test('CF-INC-001 filters ingresos unicos by source and date from UI @P1', async ({
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

    const createdIds: number[] = []
    const targetDate = isoDateDaysAgo(1)
    const outsideDate = isoDateDaysAgo(45)

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const fuenteIngreso = expectCatalogo(catalogos.data?.fuentesIngreso?.[0], 'Expected first income source.')
      const otherFuenteIngreso = expectCatalogo(catalogos.data?.fuentesIngreso?.[1], 'Expected second income source.')

      const matchingIngreso = {
        ...ingresoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Ingreso-UI-Filtro-Match'))
          .withFecha(targetDate)
          .withFuenteIngresoId(fuenteIngreso.id)
          .build(),
      }

      const outsideDateIngreso = {
        ...ingresoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Ingreso-UI-Filtro-Outside-Date'))
          .withFecha(outsideDate)
          .withFuenteIngresoId(fuenteIngreso.id)
          .build(),
      }

      const outsideSourceIngreso = {
        ...ingresoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Ingreso-UI-Filtro-Outside-Source'))
          .withFecha(targetDate)
          .withFuenteIngresoId(otherFuenteIngreso.id)
          .build(),
      }

      for (const ingreso of [matchingIngreso, outsideDateIngreso, outsideSourceIngreso]) {
        const response = await ingresosUnicosApi.create(authSession.token, ingreso)
        const body = await expectSuccessfulResponse(response)
        const id = body.data?.id ?? body.data?.ingreso?.id
        expectDefined(id, `Expected created ingreso id for ${ingreso.descripcion}`)
        createdIds.push(id)
      }

      await authenticatedPage.goto('/')
      await ingresosPage.gotoUnicos()
      await ingresosPage.expectLoaded()
      await ingresosPage.expectIngresoVisible(matchingIngreso.descripcion)
      await ingresosPage.expectIngresoVisible(outsideSourceIngreso.descripcion)

      await ingresosPage.openFilters()
      await ingresosPage.filterIngresosUnicosByFuente(catalogoName(fuenteIngreso, ['nombre']))
      await ingresosPage.filterIngresosUnicosByDateRange(targetDate, targetDate)

      await ingresosPage.expectIngresoVisible(matchingIngreso.descripcion)
      await ingresosPage.expectIngresoNotVisible(outsideDateIngreso.descripcion)
      await ingresosPage.expectIngresoNotVisible(outsideSourceIngreso.descripcion)
    } finally {
      const deleteResponses = await ingresosUnicosApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })
})

async function getCatalogos(catalogosApi: CatalogosApiClient, token: string) {
  const response = await catalogosApi.getAll(token)

  return (await expectSuccessfulResponse(response)) as CatalogosResponse
}

function expectCatalogo(item: CatalogoItem | undefined, message: string) {
  expectDefined(item, message)

  return item
}

type CatalogoNameField = Exclude<keyof CatalogoItem, 'id'>

function catalogoName(item: CatalogoItem, fields: CatalogoNameField[]) {
  const name = fields.map((field) => item[field]).find(Boolean)

  expectDefined(name, `Expected catalog item ${item.id} to have display name.`)

  return name
}

function isoDateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
