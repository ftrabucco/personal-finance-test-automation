import { expect, test } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse, expectSuccessfulResponses } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogoItem, CatalogosApiClient, CatalogosResponse } from '@api/catalogos.api'
import type { GastoUnicoRequest, GastosUnicosApiClient } from '@api/gastos-unicos.api'
import type { GastosPage } from '@pages/GastosPage'

// This covers the "Historial: filtros restantes" and "Historial: agrupación
// y paginación" sections of docs/test-plans/dashboard-historial-test-plan.md
// (tipo_origen, importancia, free-text search, AND-combination, grouping,
// pagination, delete-from-UI). Edit-from-UI (CF-EXP-003) is NOT covered here:
// GastosHistorial.tsx only exposes an "Eliminar" action per row, no "Editar"
// — editing a gasto único from the UI only exists in the "Únicos" tab
// (GastosUnicosTab.tsx), already covered by other specs.

test.describe('Gastos Historial filters, grouping and pagination @destructive @ui @filters', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-005 filters historial by tipo_origen @P1', async ({
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

    try {
      const { categoria, importancia, tipoPago } = await getCoreCatalogos(catalogosApi, authSession.token)

      const gasto = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-TipoOrigen'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
        })
        .build()

      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, gasto))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(gasto.descripcion)

      await gastosPage.openFilters()
      await gastosPage.filterHistorialByTipoOrigen('Único')
      await gastosPage.expectHistorialRowVisible(gasto.descripcion)

      await gastosPage.filterHistorialByTipoOrigen('Recurrente')
      await gastosPage.expectHistorialRowNotVisible(gasto.descripcion)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test('CF-EXP-005 filters historial by importancia @P1', async ({
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

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const categoria = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected first gasto category.')
      const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected first payment type.')
      const importanciaA = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected first gasto importance.')
      const importanciaB = expectCatalogo(catalogos.data?.importancias?.[1], 'Expected second gasto importance.')

      const matching = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Importancia-Match'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importanciaA.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, matching))

      const other = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Importancia-Otro'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importanciaB.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, other))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(e2eContext.dataPrefix)
      await gastosPage.expectHistorialRowVisible(matching.descripcion)
      await gastosPage.expectHistorialRowVisible(other.descripcion)

      await gastosPage.openFilters()
      await gastosPage.filterHistorialByImportancia(importanciaName(importanciaA))

      await gastosPage.expectHistorialRowVisible(matching.descripcion)
      await gastosPage.expectHistorialRowNotVisible(other.descripcion)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test('CF-EXP-005 searches historial by free text matching only the description @P1', async ({
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

    try {
      const { categoria, importancia, tipoPago } = await getCoreCatalogos(catalogosApi, authSession.token)

      const matching = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Buscar-Match'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, matching))

      const other = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Buscar-Otro'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, other))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.expectHistorialRowVisible(matching.descripcion)
      await gastosPage.expectHistorialRowVisible(other.descripcion)

      await gastosPage.searchHistorial('Buscar-Match')

      await gastosPage.expectHistorialRowVisible(matching.descripcion)
      await gastosPage.expectHistorialRowNotVisible(other.descripcion)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test('CF-EXP-005 combines categoria and importancia filters as AND, not OR @P1', async ({
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

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const categoriaX = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected first gasto category.')
      const categoriaW = expectCatalogo(catalogos.data?.categorias?.[1], 'Expected second gasto category.')
      const importanciaY = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected first gasto importance.')
      const importanciaZ = expectCatalogo(catalogos.data?.importancias?.[1], 'Expected second gasto importance.')
      const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected first payment type.')

      const matchesBoth = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-AND-Match'))
        .withCatalogos({ categoria_gasto_id: categoriaX.id, importancia_gasto_id: importanciaY.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, matchesBoth))

      const matchesOnlyCategoria = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-AND-SoloCategoria'))
        .withCatalogos({ categoria_gasto_id: categoriaX.id, importancia_gasto_id: importanciaZ.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, matchesOnlyCategoria))

      const matchesOnlyImportancia = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-AND-SoloImportancia'))
        .withCatalogos({ categoria_gasto_id: categoriaW.id, importancia_gasto_id: importanciaY.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, matchesOnlyImportancia))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(e2eContext.dataPrefix)

      await gastosPage.openFilters()
      await gastosPage.filterHistorialByCategoria(categoriaName(categoriaX))
      await gastosPage.filterHistorialByImportancia(importanciaName(importanciaY))

      await gastosPage.expectHistorialRowVisible(matchesBoth.descripcion)
      await gastosPage.expectHistorialRowNotVisible(matchesOnlyCategoria.descripcion)
      await gastosPage.expectHistorialRowNotVisible(matchesOnlyImportancia.descripcion)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test('CF-EXP-005 clearing filters restores the full list @P1', async ({
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

    try {
      const { categoria, importancia, tipoPago } = await getCoreCatalogos(catalogosApi, authSession.token)

      const gasto = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Limpiar'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, gasto))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.expectHistorialRowVisible(gasto.descripcion)

      await gastosPage.searchHistorial('this-text-matches-nothing-e2e')
      await gastosPage.expectHistorialRowNotVisible(gasto.descripcion)

      // "Limpiar todo" lives inside the collapsible filters panel, which does
      // not auto-open when a filter becomes active after mount (CollapsibleFilters'
      // `defaultOpen` only applies to the initial render).
      await gastosPage.openFilters()
      await gastosPage.clearHistorialFilters()
      await gastosPage.expectHistorialRowVisible(gasto.descripcion)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test('CF-EXP-005 grouping by categoria orders groups by subtotal descending @P2', async ({
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

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const categoriaAlto = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected first gasto category.')
      const categoriaBajo = expectCatalogo(catalogos.data?.categorias?.[1], 'Expected second gasto category.')
      const importancia = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected first gasto importance.')
      const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected first payment type.')

      const altoA = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Group-Alto-A'))
        .withMonto(50000)
        .withCatalogos({ categoria_gasto_id: categoriaAlto.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, altoA))

      const bajo = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Group-Bajo'))
        .withMonto(100)
        .withCatalogos({ categoria_gasto_id: categoriaBajo.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, bajo))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(e2eContext.dataPrefix)
      await gastosPage.expectHistorialRowVisible(altoA.descripcion)
      await gastosPage.expectHistorialRowVisible(bajo.descripcion)

      await gastosPage.toggleHistorialGroupBy()

      const altoLabel = categoriaName(categoriaAlto)
      const bajoLabel = categoriaName(categoriaBajo)
      const headers = await gastosPage.historialGroupHeaderLabelsInOrder()
      const altoIndex = headers.findIndex((text) => text.includes(altoLabel))
      const bajoIndex = headers.findIndex((text) => text.includes(bajoLabel))
      const context = `Got group order: ${headers.join(' | ')}`

      expect(altoIndex, `Expected a group header for "${altoLabel}". ${context}`).toBeGreaterThanOrEqual(0)
      expect(bajoIndex, `Expected a group header for "${bajoLabel}". ${context}`).toBeGreaterThanOrEqual(0)
      expect(altoIndex, `Expected "${altoLabel}" (higher subtotal) before "${bajoLabel}". ${context}`).toBeLessThan(bajoIndex)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test.skip('BUG-2026-007 grouping by date shows a subtotal per group @P3', async () => {
    // Expected behavior documented in docs/analysis/known-defects.md (BUG-2026-007)
    // and docs/test-plans/dashboard-historial-test-plan.md ("Agrupar por fecha
    // muestra subtotales por día"). GastosHistorial.tsx only computes `subtotal`
    // for the 'category' branch of groupedGastos; the 'date' branch never sets
    // it, so date group headers show only the item count, never an amount.
    // Unskip once the frontend adds a subtotal to date groups too.
  })

  test('CF-EXP-004 canceling the delete confirmation from historial does not delete the gasto @P1', async ({
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

    try {
      const { categoria, importancia, tipoPago } = await getCoreCatalogos(catalogosApi, authSession.token)

      const gasto = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Cancelar-Borrado'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      createdIds.push(await createGasto(gastosUnicosApi, authSession.token, gasto))

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(gasto.descripcion)

      await gastosPage.expandHistorialRow(gasto.descripcion)
      await gastosPage.deleteFromHistorialExpandedRow()
      await gastosPage.cancelHistorialDelete()

      await gastosPage.expectHistorialRowVisible(gasto.descripcion)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })

  test('CF-EXP-004 confirming the delete from historial removes the gasto from the list @P1', async ({
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

    let gastoId: number | undefined

    try {
      const { categoria, importancia, tipoPago } = await getCoreCatalogos(catalogosApi, authSession.token)

      const gasto = gastoUnicoBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Historial-Confirmar-Borrado'))
        .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
        .build()
      gastoId = await createGasto(gastosUnicosApi, authSession.token, gasto)

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(gasto.descripcion)
      await gastosPage.expectHistorialRowVisible(gasto.descripcion)

      await gastosPage.expandHistorialRow(gasto.descripcion)
      await gastosPage.deleteFromHistorialExpandedRow()
      await gastosPage.confirmHistorialDelete()

      await gastosPage.expectHistorialRowNotVisible(gasto.descripcion)
      gastoId = undefined // already deleted via UI, nothing left to clean up by API
    } finally {
      if (gastoId) {
        await expectSuccessfulResponse(await gastosUnicosApi.delete(authSession.token, gastoId))
      }
    }
  })

  test('CF-EXP-005 pagination does not lose or duplicate rows, and changing a filter resets to page 1 @P1', async ({
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
    testInfo.setTimeout(testInfo.timeout + 60_000)

    const ITEMS_PER_PAGE = 30
    const TOTAL_ITEMS = ITEMS_PER_PAGE + 1 // forces a second page
    const createdIds: number[] = []

    try {
      const { categoria, importancia, tipoPago } = await getCoreCatalogos(catalogosApi, authSession.token)

      const descriptions = Array.from({ length: TOTAL_ITEMS }, (_, i) =>
        e2eContext.entityName(`Gasto-Historial-Pagina-${String(i).padStart(2, '0')}`),
      )

      const creationResponses = await Promise.all(
        descriptions.map((descripcion) =>
          gastosUnicosApi.create(authSession.token, {
            ...gastoUnicoBuilder
              .withDescripcion(descripcion)
              .withCatalogos({ categoria_gasto_id: categoria.id, importancia_gasto_id: importancia.id, tipo_pago_id: tipoPago.id })
              .build(),
          }),
        ),
      )

      for (const response of creationResponses) {
        const body = await expectSuccessfulResponse(response)
        const id = body.data?.id ?? body.data?.gasto?.id
        expectDefined(id, 'Expected created gasto id.')
        createdIds.push(id)
      }

      await authenticatedPage.goto('/')
      await gastosPage.gotoHistorial()
      await gastosPage.expectLoaded()
      await gastosPage.searchHistorial(e2eContext.dataPrefix)

      // Rows were created concurrently, so their on-screen order (sorted by
      // `fecha`, all equal here) is not guaranteed to match `descriptions`'
      // index order — assert by count and set membership, not by position.
      await expect(gastosPage.historialPagination()).toHaveText(/^1\s*\/\s*2$/)
      const visibleOnPage1 = await visibleDescriptions(gastosPage, descriptions)
      expect(visibleOnPage1.length, `Expected ${ITEMS_PER_PAGE} rows on page 1, got: ${visibleOnPage1.length}`).toBe(ITEMS_PER_PAGE)

      await gastosPage.goToHistorialNextPage()
      await expect(gastosPage.historialPagination()).toHaveText(/^2\s*\/\s*2$/)
      const visibleOnPage2 = await visibleDescriptions(gastosPage, descriptions)
      expect(visibleOnPage2.length, `Expected ${TOTAL_ITEMS - ITEMS_PER_PAGE} row(s) on page 2, got: ${visibleOnPage2.length}`).toBe(
        TOTAL_ITEMS - ITEMS_PER_PAGE,
      )

      const duplicated = visibleOnPage1.filter((descripcion) => visibleOnPage2.includes(descripcion))
      expect(duplicated, 'Page 1 and page 2 must not show the same row twice').toEqual([])
      expect(visibleOnPage1.length + visibleOnPage2.length, 'Expected no rows lost across pages').toBe(TOTAL_ITEMS)

      // Changing a filter while on page 2 should reset back to page 1.
      await gastosPage.openFilters()
      await gastosPage.filterHistorialByTipoOrigen('Único')
      await expect(gastosPage.historialPagination()).toHaveText(/^1\s*\/\s*2$/)
    } finally {
      await expectSuccessfulResponses(await gastosUnicosApi.deleteMany(authSession.token, createdIds))
    }
  })
})

async function getCatalogos(catalogosApi: CatalogosApiClient, token: string) {
  const response = await catalogosApi.getAll(token)

  return (await expectSuccessfulResponse(response)) as CatalogosResponse
}

async function getCoreCatalogos(catalogosApi: CatalogosApiClient, token: string) {
  const catalogos = await getCatalogos(catalogosApi, token)

  return {
    categoria: expectCatalogo(catalogos.data?.categorias?.[0], 'Expected first gasto category.'),
    importancia: expectCatalogo(catalogos.data?.importancias?.[0], 'Expected first gasto importance.'),
    tipoPago: expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected first payment type.'),
  }
}

async function createGasto(gastosUnicosApi: GastosUnicosApiClient, token: string, gasto: GastoUnicoRequest) {
  const response = await gastosUnicosApi.create(token, gasto)
  const body = await expectSuccessfulResponse(response)
  const id = body.data?.id ?? body.data?.gasto?.id
  expectDefined(id, `Expected created gasto id for ${gasto.descripcion}`)

  return id
}

function expectCatalogo(item: CatalogoItem | undefined, message: string) {
  expectDefined(item, message)

  return item
}

function categoriaName(item: CatalogoItem) {
  const name = item.nombre_categoria ?? item.nombre
  expectDefined(name, `Expected category ${item.id} to have a display name.`)

  return name
}

function importanciaName(item: CatalogoItem) {
  const name = item.nombre_importancia ?? item.nombre
  expectDefined(name, `Expected importance ${item.id} to have a display name.`)

  return name
}

async function visibleDescriptions(gastosPage: GastosPage, descriptions: string[]) {
  const visible: string[] = []

  for (const descripcion of descriptions) {
    if (await gastosPage.isHistorialRowVisible(descripcion)) {
      visible.push(descripcion)
    }
  }

  return visible
}
