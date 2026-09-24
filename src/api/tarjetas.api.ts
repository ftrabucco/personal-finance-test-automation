import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface TarjetaRequest {
  nombre: string
  tipo: 'debito' | 'credito' | 'virtual'
  banco: string
  ultimos_4_digitos?: string | null
  dia_mes_cierre?: number | null
  dia_mes_vencimiento?: number | null
  permite_cuotas?: boolean
}

export interface TarjetaResponseItem extends TarjetaRequest {
  id: number
  usuario_id: number
}

export class TarjetasApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async create(token: string, data: TarjetaRequest, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/tarjetas'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async getById(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/tarjetas/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async update(token: string, id: number, data: TarjetaRequest, metadata?: E2EMetadata) {
    return this.request.put(this.apiUrl(`/tarjetas/${id}`), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/tarjetas/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getUsage(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/tarjetas/${id}/usage`), {
      headers: this.authHeaders(token, metadata),
    })
  }
}
