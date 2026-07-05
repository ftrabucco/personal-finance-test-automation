import type { APIRequestContext } from '@playwright/test'
import { getEnvironmentConfig } from '@config/environment'

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

export class AuthApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(email: string, password: string) {
    const env = getEnvironmentConfig()

    return this.request.post(`${env.apiUrl}/auth/login`, {
      data: { email, password },
    })
  }

  async getProfile(token: string) {
    const env = getEnvironmentConfig()

    return this.request.get(`${env.apiUrl}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async getProfileWithoutToken() {
    const env = getEnvironmentConfig()

    return this.request.get(`${env.apiUrl}/auth/profile`)
  }
}
