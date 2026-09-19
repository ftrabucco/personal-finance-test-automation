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

  /**
   * Triggers the backend's manual scheduled-generation pass (recurring expenses,
   * automatic debits, installment purchases and pending gastos únicos) for the
   * authenticated user, with catch-up enabled. Runs against the real clock —
   * there is no reference-date override on the backend, so scheduled-generation
   * tests control the *data* (backdated fecha_compra/fecha_inicio) instead of
   * the clock. See docs/strategy/automation-backlog.md, "Scheduled Generation Behavior".
   */
  async generatePending(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/gastos/generate'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async delete(token: string, id: number, metadata?: E2EMetadata) {
    return this.request.delete(this.apiUrl(`/gastos/${id}`), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async deleteMany(token: string, ids: number[], metadata?: E2EMetadata) {
    return Promise.all(ids.map((id) => this.delete(token, id, metadata)))
  }
}

export interface GeneratePendingSummary {
  total_generated: number
  total_errors: number
  breakdown: {
    recurrentes: number
    debitos: number
    compras: number
    unicos: number
  }
  type: 'manual'
}

export interface GeneratePendingResponse {
  success: boolean
  data?: {
    summary: GeneratePendingSummary
    details: {
      success: Array<{ type: string; id: number; source_id?: number }>
      errors: Array<{ type: string; id: number; error: string }>
    }
    scheduled_summary?: unknown
  }
  message?: string
}

export function extractGastosConsolidados(body: GastosListResponse): GastoResponseItem[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data
  }

  return data?.gastos ?? data?.items ?? data?.results ?? data?.data ?? []
}
