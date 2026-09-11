import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'

export interface GastoUnicoRequest {
  descripcion: string
  monto: number
  fecha: string
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  moneda_origen?: 'ARS' | 'USD'
}

export interface GastoUnicoResponseItem {
  id: number
  descripcion: string
  monto?: number | string
  monto_ars?: number | string
  fecha?: string
  categoria_gasto_id?: number
  importancia_gasto_id?: number
  tipo_pago_id?: number
  moneda_origen?: 'ARS' | 'USD'
}

export interface GastoUnicoListResponse {
  success: boolean
  data?: GastoUnicoResponseItem[] | { gastos?: GastoUnicoResponseItem[] }
  error?: string
  message?: string
}

export class GastosUnicosApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request)
  }

  async list(token: string) {
    return this.request.get(this.apiUrl('/gastos-unicos'), {
      headers: this.authHeaders(token),
    })
  }

  async getById(token: string, id: number) {
    return this.request.get(this.apiUrl(`/gastos-unicos/${id}`), {
      headers: this.authHeaders(token),
    })
  }

  async create(token: string, data: GastoUnicoRequest) {
    return this.request.post(this.apiUrl('/gastos-unicos'), {
      headers: this.authHeaders(token),
      data,
    })
  }

  async delete(token: string, id: number) {
    return this.request.delete(this.apiUrl(`/gastos-unicos/${id}`), {
      headers: this.authHeaders(token),
    })
  }
}
