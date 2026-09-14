import type { CompraRequest } from '@api/compras.api'

type CatalogoIds = Pick<
  CompraRequest,
  'categoria_gasto_id' | 'importancia_gasto_id' | 'tipo_pago_id'
>

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export class CompraBuilder {
  private data: Partial<CompraRequest> = {
    descripcion: `E2E-Compra-${Date.now()}`,
    monto_total: 1200,
    cantidad_cuotas: 3,
    cuotas_pagadas: 0,
    fecha_compra: todayIsoDate(),
    tarjeta_id: null,
    moneda_origen: 'ARS',
  }

  withDescripcion(descripcion: string) {
    this.data.descripcion = descripcion
    return this
  }

  withMontoTotal(montoTotal: number) {
    this.data.monto_total = montoTotal
    return this
  }

  withCantidadCuotas(cantidadCuotas: number) {
    this.data.cantidad_cuotas = cantidadCuotas
    return this
  }

  withCuotasPagadas(cuotasPagadas: number) {
    this.data.cuotas_pagadas = cuotasPagadas
    return this
  }

  withFechaCompra(fechaCompra: string) {
    this.data.fecha_compra = fechaCompra
    return this
  }

  withCatalogos(ids: CatalogoIds) {
    this.data = {
      ...this.data,
      ...ids,
    }

    return this
  }

  build(): CompraRequest {
    const requiredFields: Array<keyof CompraRequest> = [
      'descripcion',
      'monto_total',
      'cantidad_cuotas',
      'fecha_compra',
      'categoria_gasto_id',
      'importancia_gasto_id',
      'tipo_pago_id',
    ]

    for (const field of requiredFields) {
      if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
        throw new Error(`Missing required compra field: ${field}`)
      }
    }

    return this.data as CompraRequest
  }
}
