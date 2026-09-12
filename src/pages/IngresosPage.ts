import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import type { IngresoUnicoRequest } from '@api/ingresos-unicos.api'

type IngresoUnicoFormOptions = {
  fuenteIngreso: string
}

export class IngresosPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/ingresos')
  }

  async gotoUnicos() {
    await super.goto('/ingresos?tab=unicos')
  }

  async expectLoaded() {
    const main = this.page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Ingresos' })).toBeVisible()
    await expect(this.page.getByText('Gestiona todos tus ingresos')).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Historial' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: /Unicos|Únicos/ })).toBeVisible()
  }

  async openNewIngresoUnicoDialog() {
    await super.goto('/ingresos?tab=unicos&new=true')
    await expect(this.ingresoUnicoDialog()).toBeVisible()
  }

  async createIngresoUnico(data: IngresoUnicoRequest, options: IngresoUnicoFormOptions) {
    const dialog = this.ingresoUnicoDialog()

    await dialog.getByPlaceholder('Ej: Sueldo de febrero').fill(data.descripcion)
    await dialog.getByPlaceholder('0.00').fill(data.monto.toString())
    await dialog.locator('input[type="date"]').fill(data.fecha)

    if (data.moneda_origen) {
      await dialog.getByRole('button', { name: data.moneda_origen }).click()
    }

    await this.selectSearchableOption(dialog, 0, options.fuenteIngreso)

    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/ingresos-unicos') &&
          response.request().method() === 'POST' &&
          response.ok(),
      ),
      dialog.getByRole('button', { name: 'Guardar' }).click(),
    ])

    await expect(dialog).not.toBeVisible()
  }

  async submitIngresoUnicoForm() {
    await this.ingresoUnicoDialog().getByRole('button', { name: 'Guardar' }).click()
  }

  async expectIngresoUnicoValidationErrors() {
    const dialog = this.ingresoUnicoDialog()

    await expect(dialog.getByText('La descripción es requerida')).toBeVisible()
    await expect(dialog.getByText('El monto debe ser mayor a 0')).toBeVisible()
    await expect(dialog.getByText('La fuente de ingreso es requerida')).toBeVisible()
  }

  async expectIngresoUnicoDialogVisible() {
    await expect(this.ingresoUnicoDialog()).toBeVisible()
  }

  async expectIngresoVisible(descripcion: string) {
    await expect(this.ingresoItem(descripcion)).toBeVisible()
  }

  async deleteIngreso(descripcion: string) {
    const ingreso = this.ingresoItem(descripcion)

    await ingreso.locator('button').last().click()
    await expect(this.page.getByRole('dialog', { name: 'Eliminar ingreso' })).toBeVisible()

    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/ingresos-unicos/') &&
          response.request().method() === 'DELETE' &&
          response.ok(),
      ),
      this.page.getByRole('dialog', { name: 'Eliminar ingreso' }).getByRole('button', { name: 'Eliminar' }).click(),
    ])
  }

  async expectIngresoNotVisible(descripcion: string) {
    await expect(this.ingresoItem(descripcion)).not.toBeVisible()
  }

  private ingresoUnicoDialog() {
    return this.page.getByRole('dialog', { name: 'Nuevo Ingreso Único' })
  }

  private ingresoItem(descripcion: string) {
    return this.page.locator('tr, div.rounded-lg').filter({ hasText: descripcion }).first()
  }
}
