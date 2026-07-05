import { test, expect } from '@fixtures/test'
import { expectSuccessfulResponse, expectUnauthorizedResponse } from '@assertions/apiAssertions'
import { requireTestUser } from '@config/environment'
import type { LoginResponse } from '@api/auth.api'

test.describe('Auth API contract @contract @api @auth @P0', () => {
  test('CF-AUTH-001 login returns a token and user @smoke-readonly', async ({ authApi }) => {
    const user = requireTestUser()

    const response = await authApi.login(user.email, user.password)
    const body = (await expectSuccessfulResponse(response)) as LoginResponse

    expect(body.data?.token).toBeTruthy()
    expect(body.data?.user.email).toBe(user.email)
    expect(body.data?.user).not.toHaveProperty('password')
  })

  test('CF-AUTH-002 profile rejects missing token @smoke-readonly', async ({ authApi }) => {
    const response = await authApi.getProfileWithoutToken()

    await expectUnauthorizedResponse(response)
  })
})
