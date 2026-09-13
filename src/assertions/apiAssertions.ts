import { expect, type APIResponse } from '@playwright/test'

export async function expectSuccessfulResponse(response: APIResponse) {
  expect(response.ok(), await response.text()).toBeTruthy()

  const body = await response.json()
  expect(body).toMatchObject({ success: true })

  return body
}

export async function expectSuccessfulResponses(responses: APIResponse[]) {
  for (const response of responses) {
    await expectSuccessfulResponse(response)
  }
}

export async function expectUnauthorizedResponse(response: APIResponse) {
  expect(response.status()).toBe(401)

  const body = await response.json()
  expect(body.success).toBe(false)
  expect(body.error || body.message).toBeTruthy()

  return body
}

export function expectDefined<T>(
  value: T | undefined | null,
  message: string,
): asserts value is NonNullable<T> {
  expect(value, message).toBeTruthy()
}

export function expectNonEmptyArray<T>(items: T[], message: string) {
  expect(items.length, message).toBeGreaterThan(0)
  return items
}

export function expectListContainsItem<T>(
  items: T[],
  predicate: (item: T) => boolean,
  message: string,
) {
  const item = items.find(predicate)

  expect(item, message).toBeTruthy()

  return item as T
}

export function expectListDoesNotContainItem<T>(
  items: T[],
  predicate: (item: T) => boolean,
  message: string,
) {
  expect(items.some(predicate), message).toBe(false)
}
