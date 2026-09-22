import type { GastoRecurrenteRequest } from '@api/gastos-recurrentes.api'

type CatalogoIds = Pick<
  GastoRecurrenteRequest,
  'categoria_gasto_id' | 'importancia_gasto_id' | 'tipo_pago_id' | 'frecuencia_gasto_id'
>

function safeFutureIsoDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export class GastoRecurrenteBuilder {
  private data: Partial<GastoRecurrenteRequest> = {
    descripcion: `E2E-Gasto-Recurrente-${Date.now()}`,
    monto: 250,
    dia_de_pago: 15,
    mes_de_pago: null,
    fecha_inicio: safeFutureIsoDate(),
    activo: true,
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

  withDiaDePago(diaDePago: number) {
    this.data.dia_de_pago = diaDePago
    return this
  }

  withMesDePago(mesDePago: number | null) {
    this.data.mes_de_pago = mesDePago
    return this
  }

  withFechaInicio(fechaInicio: string) {
    this.data.fecha_inicio = fechaInicio
    return this
  }

  withActivo(activo: boolean) {
    this.data.activo = activo
    return this
  }

  withCatalogos(ids: CatalogoIds) {
    this.data = {
      ...this.data,
      ...ids,
    }

    return this
  }

  build(): GastoRecurrenteRequest {
    const requiredFields: Array<keyof GastoRecurrenteRequest> = [
      'descripcion',
      'monto',
      'dia_de_pago',
      'frecuencia_gasto_id',
      'categoria_gasto_id',
      'importancia_gasto_id',
      'tipo_pago_id',
    ]

    for (const field of requiredFields) {
      if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
        throw new Error(`Missing required gasto recurrente field: ${field}`)
      }
    }

    return { ...this.data } as GastoRecurrenteRequest
  }
}
