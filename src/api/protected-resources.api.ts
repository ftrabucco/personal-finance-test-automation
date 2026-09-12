import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type AnonymousRequestOptions = {
  data?: unknown
  metadata?: E2EMetadata
}

export class ProtectedResourcesApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async anonymousRequest(
    method: HttpMethod,
    path: string,
    options: AnonymousRequestOptions = {},
  ) {
    return this.request.fetch(this.apiUrl(path), {
      method,
      headers: this.headers(undefined, options.metadata),
      data: options.data,
    })
  }
}
