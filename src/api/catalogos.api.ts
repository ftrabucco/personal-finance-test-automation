import type { APIRequestContext } from '@playwright/test'
import { BaseApiClient } from './BaseApiClient'

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
  constructor(request: APIRequestContext) {
    super(request)
  }

  async getAll(token: string) {
    return this.request.get(this.apiUrl('/catalogos'), {
      headers: this.authHeaders(token),
    })
  }

  async getCategorias(token: string) {
    return this.request.get(this.apiUrl('/catalogos/categorias'), {
      headers: this.authHeaders(token),
    })
  }

  async getImportancias(token: string) {
    return this.request.get(this.apiUrl('/catalogos/importancias'), {
      headers: this.authHeaders(token),
    })
  }

  async getTiposPago(token: string) {
    return this.request.get(this.apiUrl('/catalogos/tipos-pago'), {
      headers: this.authHeaders(token),
    })
  }

  async getFrecuencias(token: string) {
    return this.request.get(this.apiUrl('/catalogos/frecuencias'), {
      headers: this.authHeaders(token),
    })
  }

  async getFuentesIngreso(token: string) {
    return this.request.get(this.apiUrl('/catalogos/fuentes-ingreso'), {
      headers: this.authHeaders(token),
    })
  }
}
