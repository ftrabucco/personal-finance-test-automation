import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface CompraRequest {
  descripcion: string
  monto_total: number
  cantidad_cuotas: number
  cuotas_pagadas?: number
  fecha_compra: string
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id?: number | null
  pendiente_cuotas?: boolean
  moneda_origen?: 'ARS' | 'USD'
}

export interface CompraResponseItem extends Omit<CompraRequest, 'cuotas_pagadas'> {
  id: number
  monto_total_ars?: number | string
  monto_total_usd?: number | string | null
  tipo_cambio_usado?: number | string | null
  fecha_ultima_cuota_generada?: string | null
  cuotas_pagadas?: number
}

export interface CompraListResponse {
  success: boolean
  data?:
    | CompraResponseItem[]
    | {
        compras?: CompraResponseItem[]
        items?: CompraResponseItem[]
        results?: CompraResponseItem[]
        data?: CompraResponseItem[]
      }
  error?: string
  message?: string
}

type ComprasListParams = Record<string, string | number | boolean>

export class ComprasApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async list(token: string, params: ComprasListParams = {}, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/compras'), {
      headers: this.authHeaders(token, metadata),
      params,
    })
  }

  async getById(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/compras/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async create(token: string, data: CompraRequest, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/compras'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/compras/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async findIdsByDescription(token: string, descripcion: string, metadata?: E2EMetadata) {
    const response = await this.list(token, { limit: 100 }, metadata)
    const body = (await response.json()) as CompraListResponse

    return extractCompras(body)
      .filter((compra) => compra.descripcion === descripcion)
      .map((compra) => compra.id)
  }

  async deleteMany(token: string, ids: number[], metadata?: E2EMetadata) {
    return Promise.all(ids.map((id) => this.delete(token, id, metadata)))
  }
}

export function extractCompras(body: CompraListResponse): CompraResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.compras ?? data?.items ?? data?.results ?? data?.data ?? []
}
