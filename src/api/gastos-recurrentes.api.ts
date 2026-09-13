import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface GastoRecurrenteRequest {
  descripcion: string
  monto: number
  dia_de_pago: number
  mes_de_pago?: number | null
  fecha_inicio?: string
  frecuencia_gasto_id: number
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id?: number | null
  activo?: boolean
  moneda_origen?: 'ARS' | 'USD'
}

export interface GastoRecurrenteResponseItem extends GastoRecurrenteRequest {
  id: number
  monto_ars?: number | string
  monto_usd?: number | string | null
  tipo_cambio_referencia?: number | string | null
  ultima_fecha_generado?: string | null
}

export interface GastoRecurrenteListResponse {
  success: boolean
  data?:
    | GastoRecurrenteResponseItem[]
    | {
        gastosRecurrentes?: GastoRecurrenteResponseItem[]
        gastos?: GastoRecurrenteResponseItem[]
        items?: GastoRecurrenteResponseItem[]
        results?: GastoRecurrenteResponseItem[]
        data?: GastoRecurrenteResponseItem[]
      }
  error?: string
  message?: string
}

type GastosRecurrentesListParams = Record<string, string | number | boolean>

export class GastosRecurrentesApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async list(token: string, params: GastosRecurrentesListParams = {}, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/gastos-recurrentes'), {
      headers: this.authHeaders(token, metadata),
      params,
    })
  }

  async getById(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/gastos-recurrentes/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async create(token: string, data: GastoRecurrenteRequest, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/gastos-recurrentes'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/gastos-recurrentes/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async findIdsByDescription(token: string, descripcion: string, metadata?: E2EMetadata) {
    const response = await this.list(token, { limit: 100 }, metadata)
    const body = (await response.json()) as GastoRecurrenteListResponse

    return extractGastosRecurrentes(body)
      .filter((gasto) => gasto.descripcion === descripcion)
      .map((gasto) => gasto.id)
  }

  async deleteMany(token: string, ids: number[], metadata?: E2EMetadata) {
    return Promise.all(ids.map((id) => this.delete(token, id, metadata)))
  }
}

export function extractGastosRecurrentes(
  body: GastoRecurrenteListResponse,
): GastoRecurrenteResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.gastosRecurrentes ?? data?.gastos ?? data?.items ?? data?.results ?? data?.data ?? []
}
