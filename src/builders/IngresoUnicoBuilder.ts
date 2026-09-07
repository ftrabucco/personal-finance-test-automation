import type { IngresoUnicoRequest } from '@api/ingresos-unicos.api'

function todayAsIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export class IngresoUnicoBuilder {
  private data: Partial<IngresoUnicoRequest> = {
    descripcion: `E2E-Ingreso-Unico-${Date.now()}`,
    monto: 500,
    fecha: todayAsIsoDate(),
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

  withFuenteIngresoId(fuenteIngresoId: number) {
    this.data.fuente_ingreso_id = fuenteIngresoId
    return this
  }

  build(): IngresoUnicoRequest {
    const requiredFields: Array<keyof IngresoUnicoRequest> = [
      'descripcion',
      'monto',
      'fecha',
      'fuente_ingreso_id',
    ]

    for (const field of requiredFields) {
      if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
        throw new Error(`Missing required ingreso unico field: ${field}`)
      }
    }

    return this.data as IngresoUnicoRequest
  }
}
