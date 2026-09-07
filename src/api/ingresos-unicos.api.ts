import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'

export interface IngresoUnicoRequest {
  descripcion: string
  monto: number
  fecha: string
  fuente_ingreso_id: number
  moneda_origen?: 'ARS' | 'USD'
}

export class IngresosUnicosApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request)
  }

  async list(token: string) {
    return this.request.get(this.apiUrl('/ingresos-unicos'), {
      headers: this.authHeaders(token),
    })
  }

  async getById(token: string, id: number) {
    return this.request.get(this.apiUrl(`/ingresos-unicos/${id}`), {
      headers: this.authHeaders(token),
    })
  }

  async create(token: string, data: IngresoUnicoRequest) {
    return this.request.post(this.apiUrl('/ingresos-unicos'), {
      headers: this.authHeaders(token),
      data,
    })
  }

  async delete(token: string, id: number) {
    return this.request.delete(this.apiUrl(`/ingresos-unicos/${id}`), {
      headers: this.authHeaders(token),
    })
  }
}
