import { expect, type APIResponse } from '@playwright/test'

export async function expectSuccessfulResponse(response: APIResponse) {
  expect(response.ok(), await response.text()).toBeTruthy()

  const body = await response.json()
  expect(body).toMatchObject({ success: true })

  return body
}

export async function expectUnauthorizedResponse(response: APIResponse) {
  expect(response.status()).toBe(401)

  const body = await response.json()
  expect(body.success).toBe(false)
  expect(body.error || body.message).toBeTruthy()

  return body
}

