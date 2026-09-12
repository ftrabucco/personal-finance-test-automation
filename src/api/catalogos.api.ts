import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'
import type { E2EMetadata } from '@utils/e2eObservability'

export interface CatalogoItem {
  id: number
  nombre?: string
  nombre_categoria?: string
  nombre_importancia?: string
  nombre_frecuencia?: string
}

export interface CatalogosResponse {
  success: boolean
  data?: {
    categorias?: CatalogoItem[]
    importancias?: CatalogoItem[]
    tiposPago?: CatalogoItem[]
    frecuencias?: CatalogoItem[]
    fuentesIngreso?: CatalogoItem[]
  }
  error?: string
  message?: string
}

export class CatalogosApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, defaultMetadata?: E2EMetadata) {
    super(request, defaultMetadata)
  }

  async getAll(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/catalogos'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getCategorias(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/catalogos/categorias'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getImportancias(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/catalogos/importancias'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getTiposPago(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/catalogos/tipos-pago'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getFrecuencias(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/catalogos/frecuencias'), {
      headers: this.authHeaders(token, metadata),
    })
  }

  async getFuentesIngreso(token: string, metadata?: E2EMetadata) {
    return this.request.get(this.apiUrl('/catalogos/fuentes-ingreso'), {
      headers: this.authHeaders(token, metadata),
    })
  }
}
