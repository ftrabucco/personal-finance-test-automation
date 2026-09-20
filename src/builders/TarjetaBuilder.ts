import type { TarjetaRequest } from '@api/tarjetas.api'

export class TarjetaBuilder {
  private data: Partial<TarjetaRequest> = {
    nombre: `E2E-Tarjeta-${Date.now()}`,
    tipo: 'credito',
    banco: 'Banco E2E',
    dia_mes_cierre: 20,
    dia_mes_vencimiento: 10,
    permite_cuotas: true,
  }

  withNombre(nombre: string) {
    this.data.nombre = nombre
    return this
  }

  withTipo(tipo: TarjetaRequest['tipo']) {
    this.data.tipo = tipo
    return this
  }

  withDiaMesCierre(diaMesCierre: number) {
    this.data.dia_mes_cierre = diaMesCierre
    return this
  }

  withDiaMesVencimiento(diaMesVencimiento: number) {
    this.data.dia_mes_vencimiento = diaMesVencimiento
    return this
  }

  build(): TarjetaRequest {
    const requiredFields: Array<keyof TarjetaRequest> = ['nombre', 'tipo', 'banco']

    for (const field of requiredFields) {
      if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
        throw new Error(`Missing required tarjeta field: ${field}`)
      }
    }

    return { ...this.data } as TarjetaRequest
  }
}
