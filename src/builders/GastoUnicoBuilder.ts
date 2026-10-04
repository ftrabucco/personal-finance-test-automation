import type { GastoUnicoRequest } from '@api/gastos-unicos.api'

type CatalogoIds = Pick<
  GastoUnicoRequest,
  'categoria_gasto_id' | 'importancia_gasto_id' | 'tipo_pago_id'
>

function safePastIsoDate() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export class GastoUnicoBuilder {
  private data: Partial<GastoUnicoRequest> = {
    descripcion: `E2E-Gasto-Unico-${Date.now()}`,
    monto: 150,
    fecha: safePastIsoDate(),
    moneda_origen: 'ARS',
  }

  withDescripcion(descripcion: string) {
    this.data.descripcion = descripcion
    return this
  }

  withMonto(monto: number) {
    this.data.monto = monto
    return this
  }

  withFecha(fecha: string) {
    this.data.fecha = fecha
    return this
  }

  withCatalogos(ids: CatalogoIds) {
    this.data = {
      ...this.data,
      ...ids,
    }

    return this
  }

  build(): GastoUnicoRequest {
    const requiredFields: Array<keyof GastoUnicoRequest> = [
      'descripcion',
      'monto',
      'fecha',
      'categoria_gasto_id',
      'importancia_gasto_id',
      'tipo_pago_id',
    ]

    for (const field of requiredFields) {
      if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
        throw new Error(`Missing required gasto unico field: ${field}`)
      }
    }

    return { ...this.data } as GastoUnicoRequest
  }
}
