import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import type { GastoUnicoRequest } from '@api/gastos-unicos.api'

type GastoUnicoFormOptions = {
  categoria: string
  importancia: string
  tipoPago: string
}

export class GastosPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/gastos')
  }

  async gotoUnicos() {
    await super.goto('/gastos?tab=unicos')
  }

  async expectLoaded() {
    const main = this.page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Gastos' })).toBeVisible()
    await expect(this.page.getByText('Gestiona todos tus gastos desde un solo lugar')).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Historial' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: /Unicos|Únicos/ })).toBeVisible()
  }

  async openNewGastoUnicoDialog() {
    await this.page.getByRole('tab', { name: /Unicos|Únicos/ }).click()
    await this.page.getByRole('button', { name: 'Nuevo Gasto' }).click()
    await expect(this.gastoUnicoDialog()).toBeVisible()
  }

  async createGastoUnico(data: GastoUnicoRequest, options: GastoUnicoFormOptions) {
    const dialog = this.gastoUnicoDialog()

    await dialog.getByPlaceholder('Ej: Compra en supermercado').fill(data.descripcion)
    await dialog.getByPlaceholder('0.00').fill(data.monto.toString())
    await dialog.locator('input[type="date"]').fill(data.fecha)

    if (data.moneda_origen) {
      await dialog.getByRole('button', { name: data.moneda_origen }).click()
    }

    await this.selectSearchableOption(0, options.categoria)
    await this.selectSearchableOption(1, options.importancia)
    await this.selectSearchableOption(2, options.tipoPago)
    await this.selectSearchableOption(3, 'Sin tarjeta')

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/gastos-unicos') &&
          response.request().method() === 'POST',
      ),
      dialog.getByRole('button', { name: 'Guardar' }).click(),
    ])

    expect(response.ok(), await response.text()).toBeTruthy()
    await expect(dialog).not.toBeVisible()
  }

  async expectGastoVisible(descripcion: string) {
    await expect(this.gastoItem(descripcion)).toBeVisible()
  }

  async deleteGasto(descripcion: string) {
    const gasto = this.gastoItem(descripcion)

    await gasto.locator('button').last().click()
    await expect(this.page.getByRole('dialog', { name: 'Eliminar gasto' })).toBeVisible()

    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/gastos-unicos/') &&
          response.request().method() === 'DELETE' &&
          response.ok(),
      ),
      this.page.getByRole('dialog', { name: 'Eliminar gasto' }).getByRole('button', { name: 'Eliminar' }).click(),
    ])
  }

  async expectGastoNotVisible(descripcion: string) {
    await expect(this.gastoItem(descripcion)).not.toBeVisible()
  }

  private gastoUnicoDialog() {
    return this.page.getByRole('dialog', { name: 'Nuevo Gasto Unico' })
  }

  private gastoItem(descripcion: string) {
    return this.page.locator('tr, div.rounded-lg').filter({ hasText: descripcion }).first()
  }

  private async selectSearchableOption(index: number, optionName: string) {
    await this.gastoUnicoDialog().getByRole('combobox').nth(index).click()
    await this.page.getByRole('option', { name: optionName, exact: true }).click()
  }
}
