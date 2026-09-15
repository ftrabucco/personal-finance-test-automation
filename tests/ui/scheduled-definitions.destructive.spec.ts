import { test } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse, expectSuccessfulResponses } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogoItem, CatalogosApiClient, CatalogosResponse } from '@api/catalogos.api'

test.describe('Scheduled expense definitions UI destructive @destructive @ui @gastos @scheduled @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-001 displays an API-created gasto recurrente definition in UI', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    e2eContext,
    gastosPage,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
    preferenciasApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const catalogoIds = requiredScheduledExpenseCatalogos(catalogos)

      const gastoRecurrente = {
        ...gastoRecurrenteBuilder
          .withDescripcion(e2eContext.entityName('Gasto-Recurrente-UI-Definition'))
          .withCatalogos(catalogoIds)
          .build(),
      }

      const createResponse = await gastosRecurrentesApi.create(authSession.token, gastoRecurrente)
      const createBody = await expectSuccessfulResponse(createResponse)
      const gastoRecurrenteId = createBody.data?.id ?? createBody.data?.gastoRecurrente?.id
      expectDefined(gastoRecurrenteId, 'Expected created gasto recurrente id')
      createdIds.push(gastoRecurrenteId)

      const moduleResponses = await preferenciasApi.ensureModulesActive(authSession.token, [
        'gastos_recurrentes',
      ])
      await expectSuccessfulResponses(moduleResponses)

      await authenticatedPage.goto('/')
      await gastosPage.gotoRecurrentes()
      await gastosPage.expectLoaded()

      await gastosPage.expectGastoRecurrenteVisible(gastoRecurrente.descripcion)
    } finally {
      const deleteResponses = await gastosRecurrentesApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })

  test('CF-SCH-002 displays an API-created debito automatico definition in UI', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    debitosAutomaticosApi,
    debitoAutomaticoBuilder,
    e2eContext,
    gastosPage,
    preferenciasApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const catalogoIds = requiredScheduledExpenseCatalogos(catalogos)

      const debitoAutomatico = {
        ...debitoAutomaticoBuilder
          .withDescripcion(e2eContext.entityName('Debito-Automatico-UI-Definition'))
          .withCatalogos(catalogoIds)
          .build(),
      }

      const createResponse = await debitosAutomaticosApi.create(authSession.token, debitoAutomatico)
      const createBody = await expectSuccessfulResponse(createResponse)
      const debitoAutomaticoId = createBody.data?.id ?? createBody.data?.debitoAutomatico?.id
      expectDefined(debitoAutomaticoId, 'Expected created debito automatico id')
      createdIds.push(debitoAutomaticoId)

      const moduleResponses = await preferenciasApi.ensureModulesActive(authSession.token, [
        'debitos_automaticos',
      ])
      await expectSuccessfulResponses(moduleResponses)

      await authenticatedPage.goto('/')
      await gastosPage.gotoDebitos()
      await gastosPage.expectLoaded()

      await gastosPage.expectDebitoAutomaticoVisible(debitoAutomatico.descripcion)
    } finally {
      const deleteResponses = await debitosAutomaticosApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })

  test('CF-SCH-003 displays an API-created compra en cuotas definition in UI', async ({
    authenticatedPage,
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    e2eContext,
    gastosPage,
    preferenciasApi,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []

    try {
      const catalogos = await getCatalogos(catalogosApi, authSession.token)
      const categoria = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected at least one expense category.')
      const importancia = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected at least one expense importance.')
      const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected at least one payment type.')

      const compra = {
        ...compraBuilder
          .withDescripcion(e2eContext.entityName('Compra-UI-Definition'))
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build(),
      }

      const createResponse = await comprasApi.create(authSession.token, compra)
      const createBody = await expectSuccessfulResponse(createResponse)
      const compraId = createBody.data?.id ?? createBody.data?.compra?.id
      expectDefined(compraId, 'Expected created compra id')
      createdIds.push(compraId)

      const moduleResponses = await preferenciasApi.ensureModulesActive(authSession.token, [
        'compras',
      ])
      await expectSuccessfulResponses(moduleResponses)

      await authenticatedPage.goto('/')
      await gastosPage.gotoCompras()
      await gastosPage.expectLoaded()

      await gastosPage.expectCompraVisible(compra.descripcion)
    } finally {
      const deleteResponses = await comprasApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })
})

async function getCatalogos(catalogosApi: CatalogosApiClient, token: string) {
  const response = await catalogosApi.getAll(token)

  return (await expectSuccessfulResponse(response)) as CatalogosResponse
}

function requiredScheduledExpenseCatalogos(catalogos: CatalogosResponse) {
  const categoria = expectCatalogo(catalogos.data?.categorias?.[0], 'Expected at least one expense category.')
  const importancia = expectCatalogo(catalogos.data?.importancias?.[0], 'Expected at least one expense importance.')
  const tipoPago = expectCatalogo(catalogos.data?.tiposPago?.[0], 'Expected at least one payment type.')
  const frecuencia = expectCatalogo(catalogos.data?.frecuencias?.[0], 'Expected at least one expense frequency.')

  return {
    categoria_gasto_id: categoria.id,
    importancia_gasto_id: importancia.id,
    tipo_pago_id: tipoPago.id,
    frecuencia_gasto_id: frecuencia.id,
  }
}

function expectCatalogo(item: CatalogoItem | undefined, message: string) {
  expectDefined(item, message)

  return item
}
