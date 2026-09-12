import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface GastoResponseItem {
  id: number
  descripcion: string
  monto?: number | string
  monto_ars?: number | string
  fecha?: string
  tipo_origen?: string
  id_origen?: number
  origen_id?: number
  categoria_gasto_id?: number
  importancia_gasto_id?: number
  tipo_pago_id?: number
  moneda_origen?: 'ARS' | 'USD'
}

export interface GastosListResponse {
  success: boolean
  data?:
    | GastoResponseItem[]
    | {
        gastos?: GastoResponseItem[]
        items?: GastoResponseItem[]
        results?: GastoResponseItem[]
        data?: GastoResponseItem[]
      }
  error?: string
  message?: string
}

type GastosListParams = Record<string, string | number | boolean>

export class GastosApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async list(token: string, params: GastosListParams = {}, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/gastos'), {
      headers: this.authHeaders(token, metadata),
      params,
    })
  }

  async findByDescription(token: string, descripcion: string, metadata?: E2EMetadata) {
    const response = await this.list(token, { limit: 100 }, metadata)
    const body = (await response.json()) as GastosListResponse

    return extractGastosConsolidados(body).filter((gasto) => gasto.descripcion === descripcion)
  }
}

export function extractGastosConsolidados(body: GastosListResponse): GastoResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.gastos ?? data?.items ?? data?.results ?? data?.data ?? []
}
