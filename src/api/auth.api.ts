import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    token: string
    user: {
      id: number
      nombre: string
      email: string
    }
  }
  error?: string
}

export class AuthApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async login(email: string, password: string, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/auth/login'), {
      headers: this.headers(undefined, metadata),
      data: { email, password },
    })
  }

  async getProfile(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/auth/profile'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getProfileWithoutToken(metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/auth/profile'), {
      headers: this.headers(undefined, metadata),
    })
  }
}
