import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'

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
  constructor(request: APIRequestContext) {
    super(request)
  }

  async login(email: string, password: string) {
    return this.request.post(this.apiUrl('/auth/login'), {
      data: { email, password },
    })
  }

  async getProfile(token: string) {
    return this.request.get(this.apiUrl('/auth/profile'), {
      headers: this.authHeaders(token),
    })
  }

  async getProfileWithoutToken() {
    return this.request.get(this.apiUrl('/auth/profile'))
  }
}
