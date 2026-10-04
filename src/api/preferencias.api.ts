import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export type OptionalModule =
  | 'compras'
  | 'gastos_recurrentes'
  | 'debitos_automaticos'
  | 'ingresos_recurrentes'
  | 'tarjetas'
  | 'cuentas_bancarias'
  | 'proyecciones'
  | 'salud_financiera'

export interface PreferenciasResponse {
  success: boolean
  data?: {
    id?: number
    usuario_id?: number
    modulos_activos?: string[]
    dashboard_sections?: string[]
    balance_inicial?: number
    tema?: 'light' | 'dark' | 'system'
  }
  error?: string
  message?: string
}

export interface PreferenciasUpdate {
  dashboard_sections?: string[]
  balance_inicial?: number
  tema?: 'light' | 'dark' | 'system'
  modulos_activos?: string[]
}

export class PreferenciasApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async get(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/preferencias'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async update(token: string, data: PreferenciasUpdate, metadata?: E2EMetadata) {
    return this.request.put(this.apiUrl('/preferencias'), {
      headers: this.authHeaders(token, metadata),
      data,
    })
  }

  async toggleModulo(token: string, modulo: OptionalModule, activo: boolean, metadata?: E2EMetadata) {
    return this.request.patch(this.apiUrl('/preferencias/modulos'), {
      headers: this.authHeaders(token, metadata),
      data: {
        modulo,
        activo,
      },
    })
  }

  async ensureModulesActive(token: string, modules: OptionalModule[], metadata?: E2EMetadata) {
    const preferenciasResponse = await this.get(token, metadata)
    const preferencias = (await preferenciasResponse.json()) as PreferenciasResponse
    const activeModules = preferencias.data?.modulos_activos ?? []
    const missingModules = modules.filter((module) => !activeModules.includes(module))

    return Promise.all(missingModules.map((module) => this.toggleModulo(token, module, true, metadata)))
  }
}
