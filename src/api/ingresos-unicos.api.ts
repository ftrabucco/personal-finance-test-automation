import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface IngresoUnicoRequest {
  descripcion: string
  monto: number
  fecha: string
  fuente_ingreso_id: number
  moneda_origen?: 'ARS' | 'USD'
}

export interface IngresoUnicoResponseItem {
  id: number
  descripcion: string
  monto?: number | string
  monto_ars?: number | string
  fecha?: string
  fuente_ingreso_id?: number
  moneda_origen?: 'ARS' | 'USD'
}

export interface IngresoUnicoListResponse {
  success: boolean
  data?: IngresoUnicoResponseItem[] | { ingresos?: IngresoUnicoResponseItem[] }
  error?: string
  message?: string
}

export class IngresosUnicosApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async list(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/ingresos-unicos'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getById(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/ingresos-unicos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async create(token: string, data: IngresoUnicoRequest, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/ingresos-unicos'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/ingresos-unicos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }
}
