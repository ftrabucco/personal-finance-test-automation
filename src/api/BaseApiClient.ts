import type { APIRequestContext } from '@playwright/test'
import { getEnvironmentConfig } from '@config/environment'

export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected apiUrl(path: string) {
    const env = getEnvironmentConfig()
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${env.apiUrl}${normalizedPath}`
  }

  protected authHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    }
  }
}
