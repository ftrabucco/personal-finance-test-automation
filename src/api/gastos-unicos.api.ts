import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

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
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async list(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/gastos-unicos'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async listWithoutToken(metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/gastos-unicos'), {
      headers: this.headers(undefined, metadata),
    })
  }

  async getById(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/gastos-unicos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async create(token: string, data: GastoUnicoRequest, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/gastos-unicos'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async update(token: string, id: number, data: GastoUnicoRequest, metadata?: E2EMetadata) {
    return this.request.put(this.apiUrl(`/gastos-unicos/${id}`), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/gastos-unicos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async findIdsByDescription(token: string, descripcion: string, metadata?: E2EMetadata) {
    const response = await this.list(token, metadata)
    const body = (await response.json()) as GastoUnicoListResponse

    return extractGastos(body)
      .filter((gasto) => gasto.descripcion === descripcion)
      .map((gasto) => gasto.id)
  }

  async findIdsByDescriptionPrefix(token: string, prefix: string, metadata?: E2EMetadata) {
    const response = await this.list(token, metadata)
    const body = (await response.json()) as GastoUnicoListResponse

    return extractGastos(body)
      .filter((gasto) => gasto.descripcion.startsWith(prefix))
      .map((gasto) => gasto.id)
  }

  async deleteMany(token: string, ids: number[], metadata?: E2EMetadata) {
    return Promise.all(ids.map((id) => this.delete(token, id, metadata)))
  }
}

export function extractGastos(body: GastoUnicoListResponse): GastoUnicoResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.gastos ?? []
}
