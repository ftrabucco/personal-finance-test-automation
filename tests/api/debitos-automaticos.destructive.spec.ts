import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import { findFrecuencia, todayDayOfMonthBuenosAires } from '@utils/scheduledGeneration'
import type { CatalogosResponse } from '@api/catalogos.api'

test.describe('Debitos automaticos API destructive @destructive @api @gastos @debitos @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-SCH-002 creates, verifies and cleans up a debito automatico definition', async ({
    authSession,
    catalogosApi,
    debitosAutomaticosApi,
    debitoAutomaticoBuilder,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let debitoAutomaticoId: number | undefined

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

      const debitoAutomatico = debitoAutomaticoBuilder
        .withDescripcion(e2eContext.entityName('Debito-Automatico-API'))
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPago.id,
          frecuencia_gasto_id: frecuencia.id,
        })
        .build()

      const createResponse = await debitosAutomaticosApi.create(authSession.token, debitoAutomatico)
      const createBody = await expectSuccessfulResponse(createResponse)
      debitoAutomaticoId = createBody.data?.id ?? createBody.data?.debitoAutomatico?.id

      expect(debitoAutomaticoId).toBeTruthy()

      const getResponse = await debitosAutomaticosApi.getById(authSession.token, debitoAutomaticoId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const createdDebitoAutomatico = getBody.data?.debitoAutomatico ?? getBody.data

      expect(createdDebitoAutomatico.descripcion).toBe(debitoAutomatico.descripcion)
      expect(Number(createdDebitoAutomatico.monto)).toBe(debitoAutomatico.monto)
      expect(createdDebitoAutomatico.activo).toBe(true)
      expect(createdDebitoAutomatico.frecuencia_gasto_id).toBe(debitoAutomatico.frecuencia_gasto_id)
      expect(createdDebitoAutomatico.usa_vencimiento_tarjeta).toBe(false)
    } finally {
      if (debitoAutomaticoId) {
        const deleteResponse = await debitosAutomaticosApi.delete(authSession.token, debitoAutomaticoId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-SCH-005 edits a debito automatico: an updated monto is used by the next generation, and deactivating stops it from generating', async ({
    authSession,
    catalogosApi,
    debitosAutomaticosApi,
    debitoAutomaticoBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    const debitoAutomaticoIds: number[] = []
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
      const descripcionA = e2eContext.entityName('Debito-EditMonto')
      const payloadA = debitoAutomaticoBuilder
        .withDescripcion(descripcionA)
        .withMonto(100)
        .withDiaDePago(diaDePago)
        .withCatalogos(catalogos)
        .build()
      const createResponseA = await debitosAutomaticosApi.create(authSession.token, payloadA)
      const createBodyA = await expectSuccessfulResponse(createResponseA)
      const idA: number = createBodyA.data?.id ?? createBodyA.data?.debitoAutomatico?.id
      expect(idA).toBeTruthy()
      debitoAutomaticoIds.push(idA)

      const editedMonto = 555
      const editResponseA = await debitosAutomaticosApi.update(authSession.token, idA, {
        ...payloadA,
        monto: editedMonto,
      })
      const editBodyA = await expectSuccessfulResponse(editResponseA)
      const editedA = editBodyA.data?.debitoAutomatico ?? editBodyA.data
      expect(Number(editedA.monto)).toBe(editedMonto)

      // B: created active, then deactivated via PUT before it has ever
      // generated. Must not generate at all once inactive.
      const descripcionB = e2eContext.entityName('Debito-EditDeactivate')
      const payloadB = debitoAutomaticoBuilder
        .withDescripcion(descripcionB)
        .withMonto(200)
        .withDiaDePago(diaDePago)
        .withCatalogos(catalogos)
        .build()
      const createResponseB = await debitosAutomaticosApi.create(authSession.token, payloadB)
      const createBodyB = await expectSuccessfulResponse(createResponseB)
      const idB: number = createBodyB.data?.id ?? createBodyB.data?.debitoAutomatico?.id
      expect(idB).toBeTruthy()
      debitoAutomaticoIds.push(idB)

      const editResponseB = await debitosAutomaticosApi.update(authSession.token, idB, {
        ...payloadB,
        activo: false,
      })
      const editBodyB = await expectSuccessfulResponse(editResponseB)
      const editedB = editBodyB.data?.debitoAutomatico ?? editBodyB.data
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
      if (debitoAutomaticoIds.length > 0) {
        await debitosAutomaticosApi.deleteMany(authSession.token, debitoAutomaticoIds)
      }
    }
  })
})
