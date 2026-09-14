import { test, expect } from '@fixtures/test'
import {
  expectDefined,
  expectListContainsItem,
  expectListDoesNotContainItem,
  expectSuccessfulResponse,
} from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'
import { extractGastos } from '@api/gastos-unicos.api'
import { extractIngresos } from '@api/ingresos-unicos.api'

test.describe('Unique transaction filters API destructive @destructive @api @filters', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-005 filters gastos unicos by category and date @P1', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosUnicosApi,
    gastoUnicoBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []
    const targetDate = isoDateDaysAgo(45)
    const outsideDate = isoDateDaysAgo(75)

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const otherCategoria = catalogosBody.data?.categorias?.[1]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]

      expectDefined(categoria?.id, 'Expected at least one gasto category')
      expectDefined(importancia?.id, 'Expected at least one gasto importance')
      expectDefined(tipoPago?.id, 'Expected at least one payment type')

      const matchingGasto = {
        ...gastoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Gasto-Filtro-Match'))
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
          .withDescripcion(e2eContext.entityName('Gasto-Filtro-Outside-Date'))
          .withFecha(outsideDate)
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build(),
      }

      const createMatchingResponse = await gastosUnicosApi.create(authSession.token, matchingGasto)
      const createMatchingBody = await expectSuccessfulResponse(createMatchingResponse)
      const matchingId = createMatchingBody.data?.id ?? createMatchingBody.data?.gasto?.id
      expectDefined(matchingId, 'Expected matching gasto id')
      createdIds.push(matchingId)

      const createOutsideDateResponse = await gastosUnicosApi.create(authSession.token, outsideDateGasto)
      const createOutsideDateBody = await expectSuccessfulResponse(createOutsideDateResponse)
      const outsideDateId = createOutsideDateBody.data?.id ?? createOutsideDateBody.data?.gasto?.id
      expectDefined(outsideDateId, 'Expected outside-date gasto id')
      createdIds.push(outsideDateId)

      let outsideCategoryDescription: string | undefined
      if (otherCategoria?.id) {
        const outsideCategoryGasto = {
          ...gastoUnicoBuilder
            .withDescripcion(e2eContext.entityName('Gasto-Filtro-Outside-Category'))
            .withFecha(targetDate)
            .withCatalogos({
              categoria_gasto_id: otherCategoria.id,
              importancia_gasto_id: importancia.id,
              tipo_pago_id: tipoPago.id,
            })
            .build(),
        }

        const createOutsideCategoryResponse = await gastosUnicosApi.create(authSession.token, outsideCategoryGasto)
        const createOutsideCategoryBody = await expectSuccessfulResponse(createOutsideCategoryResponse)
        const outsideCategoryId = createOutsideCategoryBody.data?.id ?? createOutsideCategoryBody.data?.gasto?.id
        expectDefined(outsideCategoryId, 'Expected outside-category gasto id')
        createdIds.push(outsideCategoryId)
        outsideCategoryDescription = outsideCategoryGasto.descripcion
      }

      const filteredResponse = await gastosUnicosApi.list(authSession.token, {
        categoria_gasto_id: categoria.id,
        fecha_desde: targetDate,
        fecha_hasta: targetDate,
        limit: 100,
      })
      const filteredBody = await expectSuccessfulResponse(filteredResponse)
      const filteredGastos = extractGastos(filteredBody)

      const filteredGasto = expectListContainsItem(
        filteredGastos,
        (gasto) => gasto.descripcion === matchingGasto.descripcion,
        'Expected filtered gastos to include the matching E2E gasto.',
      )

      expect(filteredGasto.categoria_gasto_id).toBe(categoria.id)
      expect(filteredGasto.fecha?.slice(0, 10)).toBe(targetDate)
      expectListDoesNotContainItem(
        filteredGastos,
        (gasto) => gasto.descripcion === outsideDateGasto.descripcion,
        'Expected date filter to exclude the outside-date E2E gasto.',
      )

      if (outsideCategoryDescription) {
        expectListDoesNotContainItem(
          filteredGastos,
          (gasto) => gasto.descripcion === outsideCategoryDescription,
          'Expected category filter to exclude the outside-category E2E gasto.',
        )
      }
    } finally {
      await gastosUnicosApi.deleteMany(authSession.token, createdIds)
    }
  })

  test('CF-INC-001 filters ingresos unicos by source and date @P1', async ({
    authSession,
    catalogosApi,
    e2eContext,
    ingresosUnicosApi,
    ingresoUnicoBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []
    const targetDate = isoDateDaysAgo(45)
    const outsideDate = isoDateDaysAgo(75)

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const fuenteIngreso = catalogosBody.data?.fuentesIngreso?.[0]
      const otherFuenteIngreso = catalogosBody.data?.fuentesIngreso?.[1]

      expectDefined(fuenteIngreso?.id, 'Expected at least one income source')

      const matchingIngreso = {
        ...ingresoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Ingreso-Filtro-Match'))
          .withFecha(targetDate)
          .withFuenteIngresoId(fuenteIngreso.id)
          .build(),
      }

      const outsideDateIngreso = {
        ...ingresoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Ingreso-Filtro-Outside-Date'))
          .withFecha(outsideDate)
          .withFuenteIngresoId(fuenteIngreso.id)
          .build(),
      }

      const createMatchingResponse = await ingresosUnicosApi.create(authSession.token, matchingIngreso)
      const createMatchingBody = await expectSuccessfulResponse(createMatchingResponse)
      const matchingId = createMatchingBody.data?.id ?? createMatchingBody.data?.ingreso?.id
      expectDefined(matchingId, 'Expected matching ingreso id')
      createdIds.push(matchingId)

      const createOutsideDateResponse = await ingresosUnicosApi.create(authSession.token, outsideDateIngreso)
      const createOutsideDateBody = await expectSuccessfulResponse(createOutsideDateResponse)
      const outsideDateId = createOutsideDateBody.data?.id ?? createOutsideDateBody.data?.ingreso?.id
      expectDefined(outsideDateId, 'Expected outside-date ingreso id')
      createdIds.push(outsideDateId)

      let outsideSourceDescription: string | undefined
      if (otherFuenteIngreso?.id) {
        const outsideSourceIngreso = {
          ...ingresoUnicoBuilder
            .withDescripcion(e2eContext.entityName('Ingreso-Filtro-Outside-Source'))
            .withFecha(targetDate)
            .withFuenteIngresoId(otherFuenteIngreso.id)
            .build(),
        }

        const createOutsideSourceResponse = await ingresosUnicosApi.create(authSession.token, outsideSourceIngreso)
        const createOutsideSourceBody = await expectSuccessfulResponse(createOutsideSourceResponse)
        const outsideSourceId = createOutsideSourceBody.data?.id ?? createOutsideSourceBody.data?.ingreso?.id
        expectDefined(outsideSourceId, 'Expected outside-source ingreso id')
        createdIds.push(outsideSourceId)
        outsideSourceDescription = outsideSourceIngreso.descripcion
      }

      const filteredResponse = await ingresosUnicosApi.list(authSession.token, {
        fuente_ingreso_id: fuenteIngreso.id,
        fecha_desde: targetDate,
        fecha_hasta: targetDate,
        limit: 100,
      })
      const filteredBody = await expectSuccessfulResponse(filteredResponse)
      const filteredIngresos = extractIngresos(filteredBody)

      const filteredIngreso = expectListContainsItem(
        filteredIngresos,
        (ingreso) => ingreso.descripcion === matchingIngreso.descripcion,
        'Expected filtered ingresos to include the matching E2E ingreso.',
      )

      expect(filteredIngreso.fuente_ingreso_id).toBe(fuenteIngreso.id)
      expect(filteredIngreso.fecha?.slice(0, 10)).toBe(targetDate)
      expectListDoesNotContainItem(
        filteredIngresos,
        (ingreso) => ingreso.descripcion === outsideDateIngreso.descripcion,
        'Expected date filter to exclude the outside-date E2E ingreso.',
      )

      if (outsideSourceDescription) {
        expectListDoesNotContainItem(
          filteredIngresos,
          (ingreso) => ingreso.descripcion === outsideSourceDescription,
          'Expected source filter to exclude the outside-source E2E ingreso.',
        )
      }
    } finally {
      await ingresosUnicosApi.deleteMany(authSession.token, createdIds)
    }
  })

  test('BUG-2026-005 CF-EXP-005 filters gastos unicos by currency @P1', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosUnicosApi,
    gastoUnicoBuilder,
  }) => {
    test.fail(true, 'BUG-2026-005: gastos unicos API currently ignores moneda_origen query filters.')
    requireDestructiveTestsAllowed()

    const createdIds: number[] = []
    const targetDate = isoDateDaysAgo(90)

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]

      expectDefined(categoria?.id, 'Expected at least one gasto category')
      expectDefined(importancia?.id, 'Expected at least one gasto importance')
      expectDefined(tipoPago?.id, 'Expected at least one payment type')

      const arsGasto = {
        ...gastoUnicoBuilder
          .withDescripcion(e2eContext.entityName('Gasto-Filtro-Currency-ARS'))
          .withFecha(targetDate)
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build(),
      }

      const createResponse = await gastosUnicosApi.create(authSession.token, arsGasto)
      const createBody = await expectSuccessfulResponse(createResponse)
      const gastoId = createBody.data?.id ?? createBody.data?.gasto?.id
      expectDefined(gastoId, 'Expected ARS gasto id')
      createdIds.push(gastoId)

      const filteredResponse = await gastosUnicosApi.list(authSession.token, {
        moneda_origen: 'USD',
        fecha_desde: targetDate,
        fecha_hasta: targetDate,
        limit: 100,
      })
      const filteredBody = await expectSuccessfulResponse(filteredResponse)
      const filteredGastos = extractGastos(filteredBody)

      expectListDoesNotContainItem(
        filteredGastos,
        (gasto) => gasto.descripcion === arsGasto.descripcion,
        'Expected USD currency filter to exclude an ARS E2E gasto.',
      )
    } finally {
      await gastosUnicosApi.deleteMany(authSession.token, createdIds)
    }
  })
})

function isoDateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
