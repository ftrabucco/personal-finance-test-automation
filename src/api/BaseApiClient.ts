import type { APIRequestContext } from '@playwright/test'
import { getEnvironmentConfig } from '@config/environment'
import { buildE2EHeaders, type E2EMetadata } from '@utils/e2eObservability'

export abstract class BaseApiClient {
  protected constructor(
    protected readonly request: APIRequestContext,
    private readonly defaultMetadata?: E2EMetadata,
  ) {}

  protected apiUrl(path: string) {
    const env = getEnvironmentConfig()
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${env.apiUrl}${normalizedPath}`
  }

  protected headers(headers?: Record<string, string>, metadata?: E2EMetadata) {
    return {
      ...buildE2EHeaders(metadata ?? this.defaultMetadata),
      ...headers,
    }
  }

  protected authHeaders(token: string, metadata?: E2EMetadata) {
    return {
      ...this.headers(undefined, metadata),
      Authorization: `Bearer ${token}`,
    }
  }
}
