import type { CatalogosApiClient, CatalogoItem, CatalogosResponse } from '@api/catalogos.api'
import type { GastoUnicoRequest } from '@api/gastos-unicos.api'
import type { IngresoUnicoRequest } from '@api/ingresos-unicos.api'
import type { GastoUnicoBuilder } from '@builders/GastoUnicoBuilder'
import type { IngresoUnicoBuilder } from '@builders/IngresoUnicoBuilder'
import {
  expectDefined,
  expectNonEmptyArray,
  expectSuccessfulResponse,
} from '@assertions/apiAssertions'
import type { E2ETestContext } from '@utils/e2eObservability'

type GastoUnicoUiOptions = {
  categoria: string
  importancia: string
  tipoPago: string
}

type IngresoUnicoUiOptions = {
  fuenteIngreso: string
}

export class FinanceTestDataFactory {
  constructor(
    private readonly catalogosApi: CatalogosApiClient,
    private readonly gastoUnicoBuilder: GastoUnicoBuilder,
    private readonly ingresoUnicoBuilder: IngresoUnicoBuilder,
    private readonly e2eContext: E2ETestContext,
  ) {}

  async gastoUnicoForUi(token: string) {
    const catalogos = await this.getCatalogos(token)
    const categoria = firstCatalogo(catalogos.data?.categorias, 'Expected at least one expense category.')
    const importancia = firstCatalogo(catalogos.data?.importancias, 'Expected at least one expense importance.')
    const tipoPago = firstCatalogo(catalogos.data?.tiposPago, 'Expected at least one payment type.')

    const payload = this.gastoUnicoBuilder
      .withDescripcion(this.e2eContext.entityName('Gasto-Unico-UI'))
      .withCatalogos({
        categoria_gasto_id: categoria.id,
        importancia_gasto_id: importancia.id,
        tipo_pago_id: tipoPago.id,
      })
      .build()

    return {
      payload,
      uiOptions: {
        categoria: catalogoName(categoria, ['nombre', 'nombre_categoria']),
        importancia: catalogoName(importancia, ['nombre', 'nombre_importancia']),
        tipoPago: catalogoName(tipoPago, ['nombre']),
      } satisfies GastoUnicoUiOptions,
    }
  }

  async ingresoUnicoForUi(token: string) {
    const catalogos = await this.getCatalogos(token)
    const fuenteIngreso = firstCatalogo(
      catalogos.data?.fuentesIngreso,
      'Expected at least one income source.',
    )

    const payload = this.ingresoUnicoBuilder
      .withDescripcion(this.e2eContext.entityName('Ingreso-Unico-UI'))
      .withFuenteIngresoId(fuenteIngreso.id)
      .build()

    return {
      payload,
      uiOptions: {
        fuenteIngreso: catalogoName(fuenteIngreso, ['nombre']),
      } satisfies IngresoUnicoUiOptions,
    }
  }

  private async getCatalogos(token: string) {
    const response = await this.catalogosApi.getAll(token)

    return (await expectSuccessfulResponse(response)) as CatalogosResponse
  }
}

export type GastoUnicoUiTestData = Awaited<ReturnType<FinanceTestDataFactory['gastoUnicoForUi']>> & {
  payload: GastoUnicoRequest
}

export type IngresoUnicoUiTestData = Awaited<ReturnType<FinanceTestDataFactory['ingresoUnicoForUi']>> & {
  payload: IngresoUnicoRequest
}

function firstCatalogo(items: CatalogoItem[] | undefined, message: string) {
  expectDefined(items, message)
  expectNonEmptyArray(items, message)

  return items[0]
}

type CatalogoNameField = Exclude<keyof CatalogoItem, 'id'>

function catalogoName(item: CatalogoItem, fields: CatalogoNameField[]) {
  const name = fields.map((field) => item[field]).find(Boolean)

  expectDefined(name, `Expected catalog item ${item.id} to have display name.`)

  return name
}
