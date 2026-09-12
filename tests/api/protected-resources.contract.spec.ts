import { test } from '@fixtures/test'
import { expectUnauthorizedResponse } from '@assertions/apiAssertions'

test.describe('Protected resources API contract @contract @api @auth @P0', () => {
  const anonymousReadEndpoints = [
    '/catalogos',
    '/gastos',
    '/gastos/summary',
    '/gastos-unicos',
    '/compras',
    '/gastos-recurrentes',
    '/debitos-automaticos',
    '/ingresos-unicos',
    '/ingresos-recurrentes',
    '/tarjetas',
    '/cuentas-bancarias',
    '/categorias',
  ]

  const anonymousMutationEndpoints = [
    { method: 'POST' as const, path: '/gastos-unicos', data: {} },
    { method: 'PUT' as const, path: '/gastos-unicos/0', data: {} },
    { method: 'DELETE' as const, path: '/gastos-unicos/0' },
    { method: 'POST' as const, path: '/ingresos-unicos', data: {} },
    { method: 'PUT' as const, path: '/ingresos-unicos/0', data: {} },
    { method: 'DELETE' as const, path: '/ingresos-unicos/0' },
    { method: 'POST' as const, path: '/compras', data: {} },
    { method: 'POST' as const, path: '/gastos-recurrentes', data: {} },
    { method: 'POST' as const, path: '/gastos-recurrentes/0/procesar', data: {} },
    { method: 'POST' as const, path: '/debitos-automaticos', data: {} },
    { method: 'POST' as const, path: '/debitos-automaticos/0/procesar', data: {} },
    { method: 'POST' as const, path: '/ingresos-recurrentes', data: {} },
    { method: 'PATCH' as const, path: '/ingresos-recurrentes/0/toggle-activo', data: {} },
    { method: 'POST' as const, path: '/tarjetas', data: {} },
    { method: 'POST' as const, path: '/cuentas-bancarias', data: {} },
    { method: 'POST' as const, path: '/categorias', data: {} },
  ]

  test('CF-AUTH-002 rejects anonymous read access to critical finance resources @smoke-readonly', async ({
    protectedResourcesApi,
  }) => {
    const responses = await Promise.all(
      anonymousReadEndpoints.map((path) => protectedResourcesApi.anonymousRequest('GET', path)),
    )

    for (const response of responses) {
      await expectUnauthorizedResponse(response)
    }
  })

  test('CF-AUTH-002 rejects anonymous mutations before business validation @smoke-readonly', async ({
    protectedResourcesApi,
  }) => {
    const responses = await Promise.all(
      anonymousMutationEndpoints.map(({ method, path, data }) =>
        protectedResourcesApi.anonymousRequest(method, path, { data }),
      ),
    )

    for (const response of responses) {
      await expectUnauthorizedResponse(response)
    }
  })
})
