import type { DebitoAutomaticoRequest } from '@api/debitos-automaticos.api'

type CatalogoIds = Pick<
  DebitoAutomaticoRequest,
  'categoria_gasto_id' | 'importancia_gasto_id' | 'tipo_pago_id' | 'frecuencia_gasto_id'
>

export class DebitoAutomaticoBuilder {
  private data: Partial<DebitoAutomaticoRequest> = {
    descripcion: `E2E-Debito-Automatico-${Date.now()}`,
    monto: 450,
    dia_de_pago: 10,
    tarjeta_id: null,
    cuenta_bancaria_id: null,
    usa_vencimiento_tarjeta: false,
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

  withDiaDePago(diaDePago: number | null) {
    this.data.dia_de_pago = diaDePago
    return this
  }

  withMesDePago(mesDePago: number | null) {
    this.data.mes_de_pago = mesDePago
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

  build(): DebitoAutomaticoRequest {
    const requiredFields: Array<keyof DebitoAutomaticoRequest> = [
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
        throw new Error(`Missing required debito automatico field: ${field}`)
      }
    }

    return this.data as DebitoAutomaticoRequest
  }
}
