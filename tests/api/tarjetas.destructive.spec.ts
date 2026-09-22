import { test, expect } from '@fixtures/test'
import {
  expectDefined,
  expectSuccessfulResponse,
  expectValidationError,
} from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'
import type { CatalogosResponse } from '@api/catalogos.api'
import type { TarjetaRequest } from '@api/tarjetas.api'

test.describe('Tarjetas API destructive @destructive @api @tarjetas @P1', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-TAR-001 creates, verifies and cleans up a credit card; permite_cuotas is always forced true', async ({
    authSession,
    tarjetasApi,
    tarjetaBuilder,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined

    try {
      const tarjeta = tarjetaBuilder
        .withNombre(e2eContext.entityName('Tarjeta-Credito'))
        .withTipo('credito')
        .withDiaMesCierre(20)
        .withDiaMesVencimiento(10)
        .build()

      // Explicitly try to opt out of cuotas — normalizeTarjetaData overrides
      // this to true for any tipo:'credito' card, regardless of input.
      const createResponse = await tarjetasApi.create(authSession.token, {
        ...tarjeta,
        permite_cuotas: false,
      })
      const createBody = await expectSuccessfulResponse(createResponse)
      tarjetaId = createBody.data?.id ?? createBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      const getResponse = await tarjetasApi.getById(authSession.token, tarjetaId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const created = getBody.data?.tarjeta ?? getBody.data

      expect(created.nombre).toBe(tarjeta.nombre)
      expect(created.tipo).toBe('credito')
      expect(created.dia_mes_cierre).toBe(20)
      expect(created.dia_mes_vencimiento).toBe(10)
      expect(created.permite_cuotas).toBe(true)
    } finally {
      if (tarjetaId) {
        const deleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-TAR-002 creates a debit card: dia_mes_cierre/vencimiento and permite_cuotas are normalized regardless of input', async ({
    authSession,
    tarjetasApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined

    try {
      // permite_cuotas:true is sent to prove normalizeTarjetaData forces it
      // back to false for tipo:'debito'. dia_mes_cierre/vencimiento are
      // omitted on purpose: Joi's schema only accepts null/absent for a
      // non-credito card (see CF-TAR-004), so a non-null value here would
      // be a validation-error case, not a normalization case.
      const payload: TarjetaRequest = {
        nombre: e2eContext.entityName('Tarjeta-Debito'),
        tipo: 'debito',
        banco: 'Banco E2E',
        permite_cuotas: true,
      }

      const createResponse = await tarjetasApi.create(authSession.token, payload)
      const createBody = await expectSuccessfulResponse(createResponse)
      tarjetaId = createBody.data?.id ?? createBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      const getResponse = await tarjetasApi.getById(authSession.token, tarjetaId!)
      const getBody = await expectSuccessfulResponse(getResponse)
      const created = getBody.data?.tarjeta ?? getBody.data

      expect(created.dia_mes_cierre).toBeNull()
      expect(created.dia_mes_vencimiento).toBeNull()
      expect(created.permite_cuotas).toBe(false)
    } finally {
      if (tarjetaId) {
        const deleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-TAR-003 rejects creating a credit card without dia_mes_cierre/dia_mes_vencimiento', async ({
    authSession,
    tarjetasApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    const payload = {
      nombre: e2eContext.entityName('Tarjeta-Invalida'),
      tipo: 'credito',
      banco: 'Banco E2E',
    } as TarjetaRequest

    const response = await tarjetasApi.create(authSession.token, payload)
    const body = await expectValidationError(response, 'dia_mes_cierre')
    const fields = (body.details ?? []).map((detail: { field: string }) => detail.field)
    expect(fields).toContain('dia_mes_vencimiento')
  })

  test('CF-TAR-004 rejects a debit card with dia_mes_cierre/dia_mes_vencimiento set', async ({
    authSession,
    tarjetasApi,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    const payload = {
      nombre: e2eContext.entityName('Tarjeta-Invalida'),
      tipo: 'debito',
      banco: 'Banco E2E',
      dia_mes_cierre: 20,
      dia_mes_vencimiento: 10,
    } as TarjetaRequest

    const response = await tarjetasApi.create(authSession.token, payload)
    await expectValidationError(response, 'dia_mes_cierre')
  })

  test('CF-TAR-005 edits a card: PUT replaces the full record', async ({
    authSession,
    tarjetasApi,
    tarjetaBuilder,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined

    try {
      const original = tarjetaBuilder
        .withNombre(e2eContext.entityName('Tarjeta-Edit'))
        .withTipo('credito')
        .withDiaMesCierre(20)
        .withDiaMesVencimiento(10)
        .build()

      const createResponse = await tarjetasApi.create(authSession.token, original)
      const createBody = await expectSuccessfulResponse(createResponse)
      tarjetaId = createBody.data?.id ?? createBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      const editedNombre = e2eContext.entityName('Tarjeta-Edit-Renamed')
      const editResponse = await tarjetasApi.update(authSession.token, tarjetaId!, {
        ...original,
        nombre: editedNombre,
        dia_mes_cierre: 25,
      })
      const editBody = await expectSuccessfulResponse(editResponse)
      const edited = editBody.data?.tarjeta ?? editBody.data

      expect(edited.nombre).toBe(editedNombre)
      expect(edited.dia_mes_cierre).toBe(25)
      // Unchanged field, carried through because PUT replaces the full record.
      expect(edited.dia_mes_vencimiento).toBe(10)
    } finally {
      if (tarjetaId) {
        const deleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId)
        await expectSuccessfulResponse(deleteResponse)
      }
    }
  })

  test('CF-TAR-006 a card referenced by a compra cannot be deleted until the reference is removed', async ({
    authSession,
    catalogosApi,
    comprasApi,
    compraBuilder,
    tarjetasApi,
    tarjetaBuilder,
    e2eContext,
  }) => {
    requireDestructiveTestsAllowed()

    let tarjetaId: number | undefined
    let compraId: number | undefined

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
        tarjetaBuilder
          .withNombre(e2eContext.entityName('Tarjeta-InUse'))
          .withTipo('credito')
          .withDiaMesCierre(20)
          .withDiaMesVencimiento(10)
          .build(),
      )
      const tarjetaBody = await expectSuccessfulResponse(tarjetaResponse)
      tarjetaId = tarjetaBody.data?.id ?? tarjetaBody.data?.tarjeta?.id
      expect(tarjetaId).toBeTruthy()

      const usageBeforeResponse = await tarjetasApi.getUsage(authSession.token, tarjetaId!)
      const usageBeforeBody = await expectSuccessfulResponse(usageBeforeResponse)
      expect(usageBeforeBody.data?.inUse).toBe(false)

      const compra = compraBuilder
        .withDescripcion(e2eContext.entityName('Compra-InUse'))
        .withTarjetaId(tarjetaId!)
        .withCatalogos({
          categoria_gasto_id: categoria.id,
          importancia_gasto_id: importancia.id,
          tipo_pago_id: tipoPagoCredito.id,
        })
        .build()
      const createCompraResponse = await comprasApi.create(authSession.token, compra)
      const createCompraBody = await expectSuccessfulResponse(createCompraResponse)
      compraId = createCompraBody.data?.compra?.id ?? createCompraBody.data?.id
      expect(compraId).toBeTruthy()

      const usageAfterResponse = await tarjetasApi.getUsage(authSession.token, tarjetaId!)
      const usageAfterBody = await expectSuccessfulResponse(usageAfterResponse)
      expect(usageAfterBody.data?.inUse).toBe(true)
      expect(usageAfterBody.data?.usage?.compras).toBeGreaterThanOrEqual(1)

      const blockedDeleteResponse = await tarjetasApi.delete(authSession.token, tarjetaId!)
      expect(blockedDeleteResponse.status()).toBe(400)
      const blockedDeleteBody = await blockedDeleteResponse.json()
      expect(blockedDeleteBody.success).toBe(false)

      // Remove the reference; only then can the card be deleted.
      const deleteCompraResponse = await comprasApi.delete(authSession.token, compraId!)
      await expectSuccessfulResponse(deleteCompraResponse)
      compraId = undefined

      const deleteTarjetaResponse = await tarjetasApi.delete(authSession.token, tarjetaId!)
      await expectSuccessfulResponse(deleteTarjetaResponse)
      tarjetaId = undefined
    } finally {
      if (compraId) {
        await comprasApi.delete(authSession.token, compraId)
      }
      if (tarjetaId) {
        await tarjetasApi.delete(authSession.token, tarjetaId)
      }
    }
  })
})
