import { test } from '@fixtures/test'
import { expectUnauthorizedResponse } from '@assertions/apiAssertions'

test.describe('Protected resources API contract @contract @api @auth @P0', () => {
  test('CF-AUTH-002 rejects anonymous access to critical finance resources @smoke-readonly', async ({
    catalogosApi,
    gastosUnicosApi,
    ingresosUnicosApi,
  }) => {
    const responses = await Promise.all([
      catalogosApi.getAllWithoutToken(),
      gastosUnicosApi.listWithoutToken(),
      ingresosUnicosApi.listWithoutToken(),
    ])

    for (const response of responses) {
      await expectUnauthorizedResponse(response)
    }
  })
})
