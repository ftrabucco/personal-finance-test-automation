import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface DebitoAutomaticoRequest {
  descripcion: string
  monto: number
  dia_de_pago?: number | null
  mes_de_pago?: number | null
  frecuencia_gasto_id: number
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id?: number | null
  cuenta_bancaria_id?: number | null
  usa_vencimiento_tarjeta?: boolean
  activo?: boolean
  moneda_origen?: 'ARS' | 'USD'
}

export interface DebitoAutomaticoResponseItem extends DebitoAutomaticoRequest {
  id: number
  fecha_inicio?: string | null
  fecha_fin?: string | null
  monto_ars?: number | string
  monto_usd?: number | string | null
  tipo_cambio_referencia?: number | string | null
  ultima_fecha_generado?: string | null
}

export interface DebitoAutomaticoListResponse {
  success: boolean
  data?:
    | DebitoAutomaticoResponseItem[]
    | {
        debitosAutomaticos?: DebitoAutomaticoResponseItem[]
        debitos?: DebitoAutomaticoResponseItem[]
        items?: DebitoAutomaticoResponseItem[]
        results?: DebitoAutomaticoResponseItem[]
        data?: DebitoAutomaticoResponseItem[]
      }
  error?: string
  message?: string
}

type DebitosAutomaticosListParams = Record<string, string | number | boolean>

export class DebitosAutomaticosApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async list(token: string, params: DebitosAutomaticosListParams = {}, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/debitos-automaticos'), {
      headers: this.authHeaders(token, metadata),
      params,
    })
  }

  async getById(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl(`/debitos-automaticos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async create(token: string, data: DebitoAutomaticoRequest, metadata?: E2EMetadata) {
    return this.request.post(this.apiUrl('/debitos-automaticos'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/debitos-automaticos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async findIdsByDescription(token: string, descripcion: string, metadata?: E2EMetadata) {
    const response = await this.list(token, { limit: 100 }, metadata)
    const body = (await response.json()) as DebitoAutomaticoListResponse

    return extractDebitosAutomaticos(body)
      .filter((debito) => debito.descripcion === descripcion)
      .map((debito) => debito.id)
  }

  async deleteMany(token: string, ids: number[], metadata?: E2EMetadata) {
    return Promise.all(ids.map((id) => this.delete(token, id, metadata)))
  }
}

export function extractDebitosAutomaticos(
  body: DebitoAutomaticoListResponse,
): DebitoAutomaticoResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.debitosAutomaticos ?? data?.debitos ?? data?.items ?? data?.results ?? data?.data ?? []
}
