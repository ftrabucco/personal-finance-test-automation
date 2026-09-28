import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import { findFrecuencia, shiftedIsoDate, todayDayOfMonthBuenosAires } from '@utils/scheduledGeneration'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Gastos recurrentes API destructive @destructive @api @gastos @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  // CF-SCH-004 calls GET /gastos/generate, which processes every pending item
  // for the authenticated user in one call (not scoped to this test's entities).
  // `serial` keeps this file protected from cross-test interference even if run
  // outside the npm script that sets E2E_WORKERS=1 (see scheduled-generation.destructive.spec.ts).
  test.describe.configure({ mode: 'serial' })

  test('CF-SCH-001 creates, verifies and cleans up a gasto recurrente definition', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
  }) => {
    requireDestructiveTestsAllowed()

    let gastoRecurrenteId: number | undefined

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]
      const frecuencia = catalogosBody.data?.frecuencias?.[0]

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuencia, 'Expected at least one expense frequency.')

      const gastoRecurrente = gastoRecurrenteBuilder
        .withDescripcion(e2eContext.entityName('Gasto-Recurrente-API'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
          frecuencia_gasto_id: frecuencia.id,
        })
        .build()

      const createResponse = await gastosRecurrentesApi.create(authSession.token, gastoRecurrente)
      const createBody = await expectSuccessfulResponse(createResponse)
      gastoRecurrenteId = createBody.data?.id ?? createBody.data?.gastoRecurrente?.id

      expect(gastoRecurrenteId).toBeTruthy()

      const getResponse = await gastosRecurrentesApi.getById(authSession.token, gastoRecurrenteId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdGastoRecurrente = getBody.data?.gastoRecurrente ?? getBody.data

      expect(createdGastoRecurrente.descripcion).toBe(gastoRecurrente.descripcion)
      expect(Number(createdGastoRecurrente.monto)).toBe(gastoRecurrente.monto)
      expect(createdGastoRecurrente.activo).toBe(true)
      expect(createdGastoRecurrente.frecuencia_gasto_id).toBe(gastoRecurrente.frecuencia_gasto_id)
    } finally {
      if (gastoRecurrenteId) {
        const deleteResponse = await gastosRecurrentesApi.delete(authSession.token, gastoRecurrenteId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-SCH-004 edits a gasto recurrente: an updated monto is used by the next generation, and deactivating stops it from generating', async ({
    authSession,
    catalogosApi,
    e2eContext,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
    gastosApi,
  }) => {
    requireDestructiveTestsAllowed()

    const gastoRecurrenteIds: number[] = []
    const generatedGastoIds: number[] = []

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]
      // "Mensual" specifically: findByDescription-based generation
      // assertions below need a frequency the scheduler actually acts on —
      // frecuencias[0] is "Único", which never generates.
      const frecuencia = findFrecuencia(catalogosBody, 'mensual')

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuencia, 'Expected a "Mensual" expense frequency in the catalog.')

      const catalogos = {
        categoria_gasto_id: categoria.id,
        importancia_gasto_id: importancia.id,
        tipo_pago_id: tipoPago.id,
        frecuencia_gasto_id: frecuencia.id,
      }
      const diaDePago = todayDayOfMonthBuenosAires()

      // A: created with monto 100, edited to 555 before it has ever
      // generated. The PUT endpoint replaces the full record (it's not a
      // partial patch), so the update payload is the original plus the one
      // changed field.
      const descripcionA = e2eContext.entityName('Recurrente-EditMonto')
      const payloadA = gastoRecurrenteBuilder
        .withDescripcion(descripcionA)
        .withMonto(100)
        .withDiaDePago(diaDePago)
        .withFechaInicio(shiftedIsoDate(-30))
        .withCatalogos(catalogos)
        .build()
      const createResponseA = await gastosRecurrentesApi.create(authSession.token, payloadA)
      const createBodyA = await expectSuccessfulResponse(createResponseA)
      const idA: number = createBodyA.data?.id ?? createBodyA.data?.gastoRecurrente?.id
      expect(idA).toBeTruthy()
      gastoRecurrenteIds.push(idA)

      const editedMonto = 555
      const editResponseA = await gastosRecurrentesApi.update(authSession.token, idA, {
        ...payloadA,
        monto: editedMonto,
      })
      const editBodyA = await expectSuccessfulResponse(editResponseA)
      const editedA = editBodyA.data?.gastoRecurrente ?? editBodyA.data
      expect(Number(editedA.monto)).toBe(editedMonto)

      // B: created active, then deactivated via PUT before it has ever
      // generated. Must not generate at all once inactive.
      const descripcionB = e2eContext.entityName('Recurrente-EditDeactivate')
      const payloadB = gastoRecurrenteBuilder
        .withDescripcion(descripcionB)
        .withMonto(200)
        .withDiaDePago(diaDePago)
        .withFechaInicio(shiftedIsoDate(-30))
        .withCatalogos(catalogos)
        .build()
      const createResponseB = await gastosRecurrentesApi.create(authSession.token, payloadB)
      const createBodyB = await expectSuccessfulResponse(createResponseB)
      const idB: number = createBodyB.data?.id ?? createBodyB.data?.gastoRecurrente?.id
      expect(idB).toBeTruthy()
      gastoRecurrenteIds.push(idB)

      const editResponseB = await gastosRecurrentesApi.update(authSession.token, idB, {
        ...payloadB,
        activo: false,
      })
      const editBodyB = await expectSuccessfulResponse(editResponseB)
      const editedB = editBodyB.data?.gastoRecurrente ?? editBodyB.data
      expect(editedB.activo).toBe(false)

      const generateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(generateResponse)

      const matchesA = await gastosApi.findByDescription(authSession.token, descripcionA)
      expect(matchesA, 'Expected A to generate using its edited monto, not the original').toHaveLength(1)
      generatedGastoIds.push(matchesA[0].id)
      expect(Number(matchesA[0].monto_ars)).toBe(editedMonto)

      const matchesB = await gastosApi.findByDescription(authSession.token, descripcionB)
      expect(matchesB, 'B was deactivated before ever generating and must not generate').toHaveLength(0)
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (gastoRecurrenteIds.length > 0) {
        await gastosRecurrentesApi.deleteMany(authSession.token, gastoRecurrenteIds)
      }
    }
  })
})
