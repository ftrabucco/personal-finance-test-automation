import type { Page, Request } from '@playwright/test'

export async function didSendRequest(
  page: Page,
  predicate: (request: Request) => boolean,
  timeout = 1000,
) {
  return page
    .waitForRequest(predicate, { timeout })
    .then(() => true)
    .catch(() => false)
}

export function isPostTo(endpoint: string) {
  return (request: Request) =>
    request.url().includes(endpoint) &&
    request.method() === 'POST'
}
