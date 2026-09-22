import { test, expect } from '@fixtures/test'
import { expectDefined, expectSuccessfulResponse } from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import {
  creditCardDueDate,
  monthsAgoIsoDate,
  regularInstallmentDate,
  shiftedIsoDate,
  thisMonthIsoDateBuenosAires,
  todayDayOfMonthBuenosAires,
  todayIsoDateBuenosAires,
} from '@utils/scheduledGeneration'
import type { CatalogosResponse, CatalogoItem } from '@api/catalogos.api'
import { extractGastosConsolidados } from '@api/gastos.api'
import type { GastosListResponse, GeneratePendingResponse } from '@api/gastos.api'

function findFrecuencia(catalogosBody: CatalogosResponse, nombre: string): CatalogoItem | undefined {
  return catalogosBody.data?.frecuencias?.find(
    (frecuencia) => frecuencia.nombre_frecuencia?.toLowerCase() === nombre,
  )
}

test.describe('Scheduled generation API destructive @destructive @api @gastos @compras @P2', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  // GET /gastos/generate isn't scoped to one test's entities — it processes
  // every pending item for the authenticated user in one call. Running these
  // tests in parallel lets one worker's generate() call sweep up another
  // worker's not-yet-asserted/not-yet-cleaned-up entities, causing cross-test
  // failures and orphaned data (see automation-backlog.md, "P2 - Scheduled
  // Generation Behavior", for the incident this caught in staging). `serial`
  // keeps this file's tests on one worker regardless of the run's --workers
  // setting; `test:staging:destructive` additionally forces E2E_WORKERS=1 for
  // the whole run so this file can't overlap with other files that also call
  // generatePending() (gastos-recurrentes/debitos-automaticos edit-flow tests).
  test.describe.configure({ mode: 'serial' })

  // monthsBack === cantidadCuotas - 1 so the *last* cuota's target date always
  // lands in the current month (fecha_compra + (cantidadCuotas - 1) months),
  // meaning every cuota is already due today and the compra fully completes
  // (pendiente_cuotas: false) by the end of the loop. Two sizes so the catch-up
  // loop itself (not just its 4-iteration case) is exercised: 6 cuotas checks
  // that generating the first cuota is followed by all 5 remaining ones, not
  // just the original 4-cuota case.
  const installmentCatchUpCases = [
    { cantidadCuotas: 4, monthsBack: 3 },
    { cantidadCuotas: 6, monthsBack: 5 },
  ]

  for (const { cantidadCuotas, monthsBack } of installmentCatchUpCases) {
    test(`CF-SCH-GEN-001 catches up all ${cantidadCuotas} missed installments in one run, using their real target dates`, async ({
      authSession,
      catalogosApi,
      comprasApi,
      compraBuilder,
      gastosApi,
      e2eContext,
    }) => {
      requireDestructiveTestsAllowed()

      let compraId: number | undefined
      const generatedGastoIds: number[] = []

      try {
        const catalogosResponse = await catalogosApi.getAll(authSession.token)
        const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

        const categoria = catalogosBody.data?.categorias?.[0]
        const importancia = catalogosBody.data?.importancias?.[0]
        const tipoPago = catalogosBody.data?.tiposPago?.[0]

        expectDefined(categoria, 'Expected at least one expense category.')
        expectDefined(importancia, 'Expected at least one expense importance.')
        expectDefined(tipoPago, 'Expected at least one payment type.')

        // Backdated `monthsBack` months, fixed on day 1 so every expected cuota
        // date lands on a day that exists in every month (no clamping) and is
        // always <= today, regardless of what day of the real month this test
        // happens to run on.
        const fechaCompra = monthsAgoIsoDate(monthsBack, 1)
        const descripcion = e2eContext.entityName('Compra-Catchup')

        const compra = compraBuilder
          .withDescripcion(descripcion)
          .withMontoTotal(4000)
          .withCantidadCuotas(cantidadCuotas)
          .withFechaCompra(fechaCompra)
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
          })
          .build()

        const createResponse = await comprasApi.create(authSession.token, compra)
        const createBody = await expectSuccessfulResponse(createResponse)
        const createdCompra = createBody.data?.compra ?? createBody.data
        compraId = createdCompra?.id
        expect(compraId).toBeTruthy()

        // The backend does not necessarily round-trip fecha_compra unchanged
        // (known off-by-one-day quirk, tracked separately). Base every expected
        // cuota date on what the backend actually stored, not on what was sent,
        // so this test verifies catch-up date math rather than that quirk.
        const storedFechaCompra: string = createdCompra.fecha_compra

        // Regression coverage: before the fix, the backend stamped
        // fecha_ultima_cuota_generada with "today" instead of the cuota's real
        // target date. That made the "already generated this month" guard trip
        // after the very first catch-up cuota, capping catch-up at one cuota per
        // real calendar month no matter how many were actually missed. Calling
        // /gastos/generate repeatedly, on the same real day, must now produce one
        // new cuota per call until every missed installment is caught up.
        for (let cuotaNumero1Based = 1; cuotaNumero1Based <= cantidadCuotas; cuotaNumero1Based++) {
          const generateResponse = await gastosApi.generatePending(authSession.token)
          const generateBody = (await expectSuccessfulResponse(generateResponse)) as GeneratePendingResponse
          expect(generateBody.data?.summary.breakdown.compras).toBeGreaterThanOrEqual(1)

          const expectedDescripcion = `${descripcion} - Cuota ${cuotaNumero1Based}/${cantidadCuotas}`
          const expectedFecha = regularInstallmentDate(storedFechaCompra, cuotaNumero1Based - 1)

          const matches = await gastosApi.findByDescription(authSession.token, expectedDescripcion)
          expect(matches, `Expected cuota ${cuotaNumero1Based}/${cantidadCuotas} after generate() call #${cuotaNumero1Based}`).toHaveLength(1)
          expect(matches[0].fecha).toBe(expectedFecha)

          generatedGastoIds.push(matches[0].id)
        }

        const compraAfterCatchUp = await comprasApi.getById(authSession.token, compraId!)
        const compraAfterCatchUpBody = await expectSuccessfulResponse(compraAfterCatchUp)
        const compraState = compraAfterCatchUpBody.data?.compra ?? compraAfterCatchUpBody.data
        expect(compraState.pendiente_cuotas).toBe(false)
        expect(compraState.fecha_ultima_cuota_generada).toBe(regularInstallmentDate(storedFechaCompra, cantidadCuotas - 1))

        // Duplicate prevention: the compra is fully generated, a further manual
        // run must not create one extra gasto beyond cantidadCuotas for it.
        const extraGenerateResponse = await gastosApi.generatePending(authSession.token)
        await expectSuccessfulResponse(extraGenerateResponse)

        const allCuotas = await Promise.all(
          Array.from({ length: cantidadCuotas }, (_, index) =>
            gastosApi.findByDescription(authSession.token, `${descripcion} - Cuota ${index + 1}/${cantidadCuotas}`),
          ),
        )
        for (const match of allCuotas) {
          expect(match).toHaveLength(1)
        }
      } finally {
        if (generatedGastoIds.length > 0) {
          await gastosApi.deleteMany(authSession.token, generatedGastoIds)
        }
        if (compraId) {
          const deleteResponse = await comprasApi.delete(authSession.token, compraId)
          await expectSuccessfulResponse(deleteResponse)
        }
      }
    })
  }

  test('CF-SCH-GEN-002 generates a monthly gasto recurrente on its payment day, respects fecha_inicio and activo, and prevents duplicates', async ({
    authSession,
    catalogosApi,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
    gastosApi,
    e2eContext,
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
      const frecuenciaMensual = findFrecuencia(catalogosBody, 'mensual')

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuenciaMensual, 'Expected a "Mensual" expense frequency in the catalog.')

      const catalogos = {
        categoria_gasto_id: categoria.id,
        importancia_gasto_id: importancia.id,
        tipo_pago_id: tipoPago.id,
        frecuencia_gasto_id: frecuenciaMensual.id,
      }

      const diaDePago = todayDayOfMonthBuenosAires()

      // The builder's build() returns its internal data object by reference, so
      // each variant is created immediately after building it (its JSON body is
      // serialized at call time) instead of collecting several built payloads
      // first — collecting them would let later .withX() calls on this same
      // builder instance mutate earlier "built" payloads still waiting to be sent.
      const createGastoRecurrente = async (payload: ReturnType<typeof gastoRecurrenteBuilder.build>) => {
        const createResponse = await gastosRecurrentesApi.create(authSession.token, payload)
        const createBody = await expectSuccessfulResponse(createResponse)
        const id: number = createBody.data?.id ?? createBody.data?.gastoRecurrente?.id
        expect(id, `Expected a created id for "${payload.descripcion}"`).toBeTruthy()
        gastoRecurrenteIds.push(id)
        return id
      }

      // Ready: payment day is today and fecha_inicio is well in the past.
      const readyDescripcion = e2eContext.entityName('Recurrente-Ready')
      await createGastoRecurrente(
        gastoRecurrenteBuilder
          .withDescripcion(readyDescripcion)
          .withDiaDePago(diaDePago)
          .withFechaInicio(shiftedIsoDate(-30))
          .withCatalogos(catalogos)
          .build(),
      )

      // Should not generate: same payment day, but inactive. The create endpoint
      // hardcodes activo:true regardless of the payload (a real backend bug —
      // see docs/strategy note), so this deactivates it via a follow-up update
      // instead, which does respect the sent value. The update endpoint requires
      // the full payload (it replaces rather than patches), so it's the original
      // payload plus the one changed field.
      const inactiveDescripcion = e2eContext.entityName('Recurrente-Inactive')
      const inactivePayload = gastoRecurrenteBuilder
        .withDescripcion(inactiveDescripcion)
        .withDiaDePago(diaDePago)
        .withFechaInicio(shiftedIsoDate(-30))
        .withCatalogos(catalogos)
        .build()
      const inactiveId = await createGastoRecurrente(inactivePayload)
      const deactivateResponse = await gastosRecurrentesApi.update(authSession.token, inactiveId, {
        ...inactivePayload,
        activo: false,
      })
      const deactivateBody = await expectSuccessfulResponse(deactivateResponse)
      const deactivated = deactivateBody.data?.gastoRecurrente ?? deactivateBody.data
      expect(deactivated.activo).toBe(false)

      // Should not generate: same payment day, but fecha_inicio is in the future.
      const notStartedDescripcion = e2eContext.entityName('Recurrente-NotStarted')
      await createGastoRecurrente(
        gastoRecurrenteBuilder
          .withDescripcion(notStartedDescripcion)
          .withDiaDePago(diaDePago)
          .withFechaInicio(shiftedIsoDate(30))
          .withActivo(true)
          .withCatalogos(catalogos)
          .build(),
      )

      const generateResponse = await gastosApi.generatePending(authSession.token)
      const generateBody = (await expectSuccessfulResponse(generateResponse)) as GeneratePendingResponse
      expect(generateBody.data?.summary.breakdown.recurrentes).toBeGreaterThanOrEqual(1)

      const readyMatches = await gastosApi.findByDescription(authSession.token, readyDescripcion)
      expect(readyMatches, 'Expected the ready gasto recurrente to generate today').toHaveLength(1)
      expect(readyMatches[0].fecha).toBe(todayIsoDateBuenosAires())
      generatedGastoIds.push(readyMatches[0].id)

      const inactiveMatches = await gastosApi.findByDescription(authSession.token, inactiveDescripcion)
      expect(inactiveMatches, 'Inactive gasto recurrente must not generate').toHaveLength(0)

      const notStartedMatches = await gastosApi.findByDescription(authSession.token, notStartedDescripcion)
      expect(notStartedMatches, 'Gasto recurrente before its fecha_inicio must not generate').toHaveLength(0)

      // Duplicate prevention: calling generate again the same day must not add a second gasto.
      const secondGenerateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(secondGenerateResponse)

      const readyMatchesAfterSecondRun = await gastosApi.findByDescription(authSession.token, readyDescripcion)
      expect(readyMatchesAfterSecondRun, 'A same-day rerun must not duplicate the gasto').toHaveLength(1)
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (gastoRecurrenteIds.length > 0) {
        await gastosRecurrentesApi.deleteMany(authSession.token, gastoRecurrenteIds)
      }
    }
  })

  test('CF-SCH-GEN-003 generates a monthly debito automatico on its payment day, skips inactive ones, and prevents duplicates', async ({
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
      const frecuenciaMensual = findFrecuencia(catalogosBody, 'mensual')

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuenciaMensual, 'Expected a "Mensual" expense frequency in the catalog.')

      const catalogos = {
        categoria_gasto_id: categoria.id,
        importancia_gasto_id: importancia.id,
        tipo_pago_id: tipoPago.id,
        frecuencia_gasto_id: frecuenciaMensual.id,
      }

      const diaDePago = todayDayOfMonthBuenosAires()

      // See the equivalent comment in CF-SCH-GEN-002: build() returns the
      // builder's internal data object by reference, so each variant is
      // created immediately after building it rather than collected first.
      const createDebitoAutomatico = async (payload: ReturnType<typeof debitoAutomaticoBuilder.build>) => {
        const createResponse = await debitosAutomaticosApi.create(authSession.token, payload)
        const createBody = await expectSuccessfulResponse(createResponse)
        const id: number = createBody.data?.id ?? createBody.data?.debitoAutomatico?.id
        expect(id, `Expected a created id for "${payload.descripcion}"`).toBeTruthy()
        debitoAutomaticoIds.push(id)
        return id
      }

      const readyDescripcion = e2eContext.entityName('Debito-Ready')
      await createDebitoAutomatico(
        debitoAutomaticoBuilder
          .withDescripcion(readyDescripcion)
          .withDiaDePago(diaDePago)
          .withCatalogos(catalogos)
          .build(),
      )

      // The create endpoint hardcodes activo:true regardless of the payload (a
      // real backend bug — see docs/strategy note), so this deactivates it via
      // a follow-up update instead, which does respect the sent value.
      const inactiveDescripcion = e2eContext.entityName('Debito-Inactive')
      const inactivePayload = debitoAutomaticoBuilder
        .withDescripcion(inactiveDescripcion)
        .withDiaDePago(diaDePago)
        .withCatalogos(catalogos)
        .build()
      const inactiveId = await createDebitoAutomatico(inactivePayload)
      const deactivateResponse = await debitosAutomaticosApi.update(authSession.token, inactiveId, {
        ...inactivePayload,
        activo: false,
      })
      const deactivateBody = await expectSuccessfulResponse(deactivateResponse)
      const deactivated = deactivateBody.data?.debitoAutomatico ?? deactivateBody.data
      expect(deactivated.activo).toBe(false)

      const generateResponse = await gastosApi.generatePending(authSession.token)
      const generateBody = (await expectSuccessfulResponse(generateResponse)) as GeneratePendingResponse
      expect(generateBody.data?.summary.breakdown.debitos).toBeGreaterThanOrEqual(1)

      const readyMatches = await gastosApi.findByDescription(authSession.token, readyDescripcion)
      expect(readyMatches, 'Expected the ready debito automatico to generate today').toHaveLength(1)
      expect(readyMatches[0].fecha).toBe(todayIsoDateBuenosAires())
      generatedGastoIds.push(readyMatches[0].id)

      const inactiveMatches = await gastosApi.findByDescription(authSession.token, inactiveDescripcion)
      expect(inactiveMatches, 'Inactive debito automatico must not generate').toHaveLength(0)

      // Duplicate prevention: calling generate again the same day must not add a second gasto.
      const secondGenerateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(secondGenerateResponse)

      const readyMatchesAfterSecondRun = await gastosApi.findByDescription(authSession.token, readyDescripcion)
      expect(readyMatchesAfterSecondRun, 'A same-day rerun must not duplicate the gasto').toHaveLength(1)
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (debitoAutomaticoIds.length > 0) {
        await debitosAutomaticosApi.deleteMany(authSession.token, debitoAutomaticoIds)
      }
    }
  })

  test('CF-SCH-GEN-004 a scheduled-generated gasto is retrievable from consolidated history by origin and by date range', async ({
    authSession,
    catalogosApi,
    gastosRecurrentesApi,
    gastoRecurrenteBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let gastoRecurrenteId: number | undefined
    let generatedGastoId: number | undefined

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]
      const frecuenciaMensual = findFrecuencia(catalogosBody, 'mensual')

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuenciaMensual, 'Expected a "Mensual" expense frequency in the catalog.')

      const descripcion = e2eContext.entityName('Recurrente-History')
      const createResponse = await gastosRecurrentesApi.create(
        authSession.token,
        gastoRecurrenteBuilder
          .withDescripcion(descripcion)
          .withDiaDePago(todayDayOfMonthBuenosAires())
          .withFechaInicio(shiftedIsoDate(-30))
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
            frecuencia_gasto_id: frecuenciaMensual.id,
          })
          .build(),
      )
      const createBody = await expectSuccessfulResponse(createResponse)
      gastoRecurrenteId = createBody.data?.id ?? createBody.data?.gastoRecurrente?.id
      expect(gastoRecurrenteId).toBeTruthy()

      const generateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(generateResponse)

      const matches = await gastosApi.findByDescription(authSession.token, descripcion)
      expect(matches, 'Expected the recurrente to have generated its gasto').toHaveLength(1)
      generatedGastoId = matches[0].id

      // Filtered by its own origin: must be the only result, cheap to assert exactly.
      const byOriginResponse = await gastosApi.list(authSession.token, {
        tipo_origen: 'recurrente',
        id_origen: gastoRecurrenteId!,
      })
      const byOriginBody = (await expectSuccessfulResponse(byOriginResponse)) as GastosListResponse
      const byOrigin = extractGastosConsolidados(byOriginBody)
      expect(byOrigin, 'Filtering consolidated history by tipo_origen + id_origen should return exactly this gasto').toHaveLength(1)
      expect(byOrigin[0].id).toBe(generatedGastoId)

      // Filtered by today's date range: this account has other real history for
      // today, so this asserts our gasto is *present*, not that it's the only one.
      const today = todayIsoDateBuenosAires()
      const byDateResponse = await gastosApi.list(authSession.token, {
        fecha_desde: today,
        fecha_hasta: today,
        limit: 200,
      })
      const byDateBody = (await expectSuccessfulResponse(byDateResponse)) as GastosListResponse
      const byDate = extractGastosConsolidados(byDateBody)
      expect(
        byDate.some((gasto) => gasto.id === generatedGastoId),
        `Expected gasto ${generatedGastoId} in the ${today} date-range filter`,
      ).toBe(true)
    } finally {
      if (generatedGastoId) {
        await gastosApi.delete(authSession.token, generatedGastoId)
      }
      if (gastoRecurrenteId) {
        await gastosRecurrentesApi.delete(authSession.token, gastoRecurrenteId)
      }
    }
  })

  test('CF-SCH-GEN-006 catches up all missed credit-card installments using their real due dates (closing/due cycle), with no duplicates', async ({
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    tarjetasApi,
    tarjetaBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined
    let compraId: number | undefined
    const generatedGastoIds: number[] = []

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      // "Crédito" specifically (permite_cuotas: true in the seed data), not
      // just tiposPago[0] ("Efectivo") — this scenario only makes sense paid
      // with a card.
      const tipoPagoCredito = catalogosBody.data?.tiposPago?.find(
        (tipoPago) => tipoPago.nombre?.toLowerCase() === 'crédito',
      )

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPagoCredito, 'Expected a "Crédito" payment type in the catalog.')

      const diaMesCierre = 20
      const diaMesVencimiento = 10

      const tarjetaResponse = await tarjetasApi.create(
        authSession.token,
        tarjetaBuilder
          .withNombre(e2eContext.entityName('Tarjeta-Catchup'))
          .withDiaMesCierre(diaMesCierre)
          .withDiaMesVencimiento(diaMesVencimiento)
          .build(),
      )
      const tarjetaBody = await expectSuccessfulResponse(tarjetaResponse)
      tarjetaId = tarjetaBody.data?.id ?? tarjetaBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      // Bought on day 1, well before dia_mes_cierre (20), so the first cuota's
      // due date is exactly one month after the purchase month, on day 10.
      // Backdated 5 months so that even the *last* (4th) cuota's due date —
      // purchase month + 1 + 3 = purchase month + 4 — lands a full calendar
      // month before today, regardless of what day of the month this test
      // happens to run on (unlike CF-SCH-GEN-001's day-1 cuotas, day-10 due
      // dates need that extra month of margin to always be "already due").
      const cantidadCuotas = 4
      const fechaCompra = monthsAgoIsoDate(5, 1)
      const descripcion = e2eContext.entityName('Compra-Tarjeta-Catchup')

      const compra = compraBuilder
        .withDescripcion(descripcion)
        .withMontoTotal(4000)
        .withCantidadCuotas(cantidadCuotas)
        .withFechaCompra(fechaCompra)
        .withTarjetaId(tarjetaId!)
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPagoCredito.id,
        })
        .build()

      const createResponse = await comprasApi.create(authSession.token, compra)
      const createBody = await expectSuccessfulResponse(createResponse)
      const createdCompra = createBody.data?.compra ?? createBody.data
      compraId = createdCompra?.id
      expect(compraId).toBeTruthy()

      // Same off-by-one-day storage quirk as CF-SCH-GEN-001 applies to
      // fecha_compra here too — base expected due dates on what was stored.
      const storedFechaCompra: string = createdCompra.fecha_compra

      for (let cuotaNumero1Based = 1; cuotaNumero1Based <= cantidadCuotas; cuotaNumero1Based++) {
        const generateResponse = await gastosApi.generatePending(authSession.token)
        const generateBody = (await expectSuccessfulResponse(generateResponse)) as GeneratePendingResponse
        expect(generateBody.data?.summary.breakdown.compras).toBeGreaterThanOrEqual(1)

        const expectedDescripcion = `${descripcion} - Cuota ${cuotaNumero1Based}/${cantidadCuotas}`
        const expectedFecha = creditCardDueDate(storedFechaCompra, diaMesCierre, diaMesVencimiento, cuotaNumero1Based - 1)

        const matches = await gastosApi.findByDescription(authSession.token, expectedDescripcion)
        expect(matches, `Expected cuota ${cuotaNumero1Based}/${cantidadCuotas} after generate() call #${cuotaNumero1Based}`).toHaveLength(1)
        expect(matches[0].fecha).toBe(expectedFecha)

        generatedGastoIds.push(matches[0].id)
      }

      const compraAfterCatchUp = await comprasApi.getById(authSession.token, compraId!)
      const compraAfterCatchUpBody = await expectSuccessfulResponse(compraAfterCatchUp)
      const compraState = compraAfterCatchUpBody.data?.compra ?? compraAfterCatchUpBody.data
      expect(compraState.pendiente_cuotas).toBe(false)

      // Duplicate prevention: fully generated, a further manual run must not
      // create a 5th gasto for it.
      const extraGenerateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(extraGenerateResponse)

      const allCuotas = await Promise.all(
        Array.from({ length: cantidadCuotas }, (_, index) =>
          gastosApi.findByDescription(authSession.token, `${descripcion} - Cuota ${index + 1}/${cantidadCuotas}`),
        ),
      )
      for (const match of allCuotas) {
        expect(match).toHaveLength(1)
      }
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (compraId) {
        const deleteResponse = await comprasApi.delete(authSession.token, compraId)
        await expectSuccessfulResponse(deleteResponse)
      }
      if (tarjetaId) {
        const deleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-SCH-GEN-007 concurrent /gastos/generate calls do not duplicate a credit-card cuota', async ({
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    tarjetasApi,
    tarjetaBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined
    let compraId: number | undefined
    const generatedGastoIds: number[] = []

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPagoCredito = catalogosBody.data?.tiposPago?.find(
        (tipoPago) => tipoPago.nombre?.toLowerCase() === 'crédito',
      )

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPagoCredito, 'Expected a "Crédito" payment type in the catalog.')

      const tarjetaResponse = await tarjetasApi.create(
        authSession.token,
        tarjetaBuilder.withNombre(e2eContext.entityName('Tarjeta-Race')).build(),
      )
      const tarjetaBody = await expectSuccessfulResponse(tarjetaResponse)
      tarjetaId = tarjetaBody.data?.id ?? tarjetaBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      // Single cuota, comfortably already due, so a single generate() call is
      // guaranteed to find it ready — this isolates the race from any
      // multi-cuota catch-up sequencing.
      const descripcion = e2eContext.entityName('Compra-Tarjeta-Race')
      const compra = compraBuilder
        .withDescripcion(descripcion)
        .withMontoTotal(1000)
        .withCantidadCuotas(1)
        .withFechaCompra(monthsAgoIsoDate(2, 1))
        .withTarjetaId(tarjetaId!)
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPagoCredito.id,
        })
        .build()

      const createResponse = await comprasApi.create(authSession.token, compra)
      const createBody = await expectSuccessfulResponse(createResponse)
      compraId = (createBody.data?.compra ?? createBody.data)?.id
      expect(compraId).toBeTruthy()

      // Two /gastos/generate calls in flight at the same time — e.g. a
      // scheduled cron run overlapping a manual "process now" click. Both
      // read `cuotasGeneradas` (via a Gasto.count query) before either has
      // committed its own insert, so both can independently decide "this
      // cuota isn't generated yet" and both create it.
      const [firstResponse, secondResponse] = await Promise.all([
        gastosApi.generatePending(authSession.token),
        gastosApi.generatePending(authSession.token),
      ])
      await expectSuccessfulResponse(firstResponse)
      await expectSuccessfulResponse(secondResponse)

      const matches = await gastosApi.findByDescription(authSession.token, `${descripcion} - Cuota 1/1`)
      generatedGastoIds.push(...matches.map((match) => match.id))
      expect(matches, 'Two concurrent generate() calls must not produce two gastos for the same cuota').toHaveLength(1)
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (compraId) {
        const deleteResponse = await comprasApi.delete(authSession.token, compraId)
        await expectSuccessfulResponse(deleteResponse)
      }
      if (tarjetaId) {
        const deleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-SCH-GEN-008 a credit-card purchase made after the closing day is due one cycle later', async ({
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    tarjetasApi,
    tarjetaBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined
    let compraId: number | undefined
    const generatedGastoIds: number[] = []

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPagoCredito = catalogosBody.data?.tiposPago?.find(
        (tipoPago) => tipoPago.nombre?.toLowerCase() === 'crédito',
      )

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPagoCredito, 'Expected a "Crédito" payment type in the catalog.')

      const diaMesCierre = 20
      const diaMesVencimiento = 10

      const tarjetaResponse = await tarjetasApi.create(
        authSession.token,
        tarjetaBuilder
          .withNombre(e2eContext.entityName('Tarjeta-PostCierre'))
          .withDiaMesCierre(diaMesCierre)
          .withDiaMesVencimiento(diaMesVencimiento)
          .build(),
      )
      const tarjetaBody = await expectSuccessfulResponse(tarjetaResponse)
      tarjetaId = tarjetaBody.data?.id ?? tarjetaBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      // Bought on day 25, *after* dia_mes_cierre (20) — this purchase belongs
      // to next month's closing cycle, so it's due a full month later than an
      // otherwise-identical purchase made before the 20th (CF-SCH-GEN-006).
      // Backdated 3 months (not 2) so the due date lands safely in the past
      // regardless of what day of the month this test runs on.
      const descripcion = e2eContext.entityName('Compra-Tarjeta-PostCierre')
      const compra = compraBuilder
        .withDescripcion(descripcion)
        .withMontoTotal(1000)
        .withCantidadCuotas(1)
        .withFechaCompra(monthsAgoIsoDate(3, 25))
        .withTarjetaId(tarjetaId!)
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPagoCredito.id,
        })
        .build()

      const createResponse = await comprasApi.create(authSession.token, compra)
      const createBody = await expectSuccessfulResponse(createResponse)
      const createdCompra = createBody.data?.compra ?? createBody.data
      compraId = createdCompra?.id
      expect(compraId).toBeTruthy()

      const storedFechaCompra: string = createdCompra.fecha_compra
      const expectedFecha = creditCardDueDate(storedFechaCompra, diaMesCierre, diaMesVencimiento, 0)

      const generateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(generateResponse)

      const matches = await gastosApi.findByDescription(authSession.token, `${descripcion} - Cuota 1/1`)
      expect(matches, 'Expected the post-cierre purchase to generate its single cuota').toHaveLength(1)
      generatedGastoIds.push(matches[0].id)
      expect(matches[0].fecha).toBe(expectedFecha)
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (compraId) {
        const deleteResponse = await comprasApi.delete(authSession.token, compraId)
        await expectSuccessfulResponse(deleteResponse)
      }
      if (tarjetaId) {
        const deleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-SCH-GEN-009 a new monthly debito automatico whose payment day already passed this month still catches up', async ({
    authSession,
    catalogosApi,
    debitosAutomaticosApi,
    debitoAutomaticoBuilder,
    gastosApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    const todayDay = todayDayOfMonthBuenosAires()
    test.skip(
      todayDay < 11,
      'Needs today to be at least the 11th of the month, to construct a payment day comfortably beyond the backend\'s few-day weekend/holiday tolerance while staying in the current month.',
    )

    let debitoAutomaticoId: number | undefined
    const generatedGastoIds: number[] = []

    try {
      const catalogosResponse = await catalogosApi.getAll(authSession.token)
      const catalogosBody = (await expectSuccessfulResponse(catalogosResponse)) as CatalogosResponse

      const categoria = catalogosBody.data?.categorias?.[0]
      const importancia = catalogosBody.data?.importancias?.[0]
      const tipoPago = catalogosBody.data?.tiposPago?.[0]
      const frecuenciaMensual = findFrecuencia(catalogosBody, 'mensual')

      expectDefined(categoria, 'Expected at least one expense category.')
      expectDefined(importancia, 'Expected at least one expense importance.')
      expectDefined(tipoPago, 'Expected at least one payment type.')
      expectDefined(frecuenciaMensual, 'Expected a "Mensual" expense frequency in the catalog.')

      // 10 days beyond the backend's weekend/holiday tolerance window
      // (calculateDateTolerance caps at 2-5 days for monthly), so this can
      // only generate today if the backend has a genuine "never generated,
      // payment day already passed" catch-up branch for débitos automáticos
      // — the same one gastos recurrentes already has. Regression coverage
      // for a real gap found while reviewing debitoAutomatico.service.js:
      // unlike recurrentes, débitos had no such branch at all, so a débito
      // created after its payment day had passed simply never generated
      // until the following month's payment day came around.
      const diaDePago = todayDay - 10
      const descripcion = e2eContext.entityName('Debito-Catchup')

      const createResponse = await debitosAutomaticosApi.create(
        authSession.token,
        debitoAutomaticoBuilder
          .withDescripcion(descripcion)
          .withDiaDePago(diaDePago)
          .withCatalogos({
            categoria_gasto_id: categoria.id,
            importancia_gasto_id: importancia.id,
            tipo_pago_id: tipoPago.id,
            frecuencia_gasto_id: frecuenciaMensual.id,
          })
          .build(),
      )
      const createBody = await expectSuccessfulResponse(createResponse)
      debitoAutomaticoId = createBody.data?.id ?? createBody.data?.debitoAutomatico?.id
      expect(debitoAutomaticoId).toBeTruthy()

      const generateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(generateResponse)

      const matches = await gastosApi.findByDescription(authSession.token, descripcion)
      expect(
        matches,
        'A débito automático whose payment day already passed this month should still generate for this month on first run, the same way a gasto recurrente does — not silently wait for next month.',
      ).toHaveLength(1)
      generatedGastoIds.push(matches[0].id)
      expect(matches[0].fecha).toBe(thisMonthIsoDateBuenosAires(diaDePago))

      // Duplicate prevention: a same-day rerun must not add a second gasto.
      const secondGenerateResponse = await gastosApi.generatePending(authSession.token)
      await expectSuccessfulResponse(secondGenerateResponse)

      const matchesAfterSecondRun = await gastosApi.findByDescription(authSession.token, descripcion)
      expect(matchesAfterSecondRun, 'A same-day rerun must not duplicate the catch-up gasto').toHaveLength(1)
    } finally {
      if (generatedGastoIds.length > 0) {
        await gastosApi.deleteMany(authSession.token, generatedGastoIds)
      }
      if (debitoAutomaticoId) {
        const deleteResponse = await debitosAutomaticosApi.delete(authSession.token, debitoAutomaticoId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })
})
