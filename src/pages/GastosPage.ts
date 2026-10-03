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

  async gotoCompras() {
    await super.goto('/gastos?tab=cuotas')
  }

  async gotoRecurrentes() {
    await super.goto('/gastos?tab=recurrentes')
  }

  async gotoDebitos() {
    await super.goto('/gastos?tab=debitos')
  }

  async gotoHistorial() {
    await super.goto('/gastos?tab=historial')
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

    await this.selectSearchableOption(dialog, 0, options.categoria)
    await this.selectSearchableOption(dialog, 1, options.importancia)
    await this.selectSearchableOption(dialog, 2, options.tipoPago)
    await this.selectSearchableOption(dialog, 3, 'Sin tarjeta')

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

  async submitGastoUnicoForm() {
    await this.gastoUnicoDialog().getByRole('button', { name: 'Guardar' }).click()
  }

  async expectGastoUnicoValidationErrors() {
    const dialog = this.gastoUnicoDialog()

    await expect(dialog.getByText('La descripción es requerida')).toBeVisible()
    await expect(dialog.getByText('El monto debe ser mayor a 0')).toBeVisible()
    await expect(dialog.getByText('La categoría es requerida')).toBeVisible()
    await expect(dialog.getByText('La importancia es requerida')).toBeVisible()
    await expect(dialog.getByText('El tipo de pago es requerido')).toBeVisible()
  }

  async expectGastoUnicoDialogVisible() {
    await expect(this.gastoUnicoDialog()).toBeVisible()
  }

  async expectGastoVisible(descripcion: string) {
    await expect(this.gastoItem(descripcion)).toBeVisible()
  }

  async expectCompraVisible(descripcion: string) {
    await expect(this.scheduledExpenseItem(descripcion)).toBeVisible()
  }

  async expectGastoRecurrenteVisible(descripcion: string) {
    await expect(this.scheduledExpenseItem(descripcion)).toBeVisible()
  }

  async expectDebitoAutomaticoVisible(descripcion: string) {
    await expect(this.scheduledExpenseItem(descripcion)).toBeVisible()
  }

  async openFilters() {
    await this.page.getByRole('button', { name: /Filtros/ }).click()
  }

  async filterGastosUnicosByCategoria(categoria: string) {
    await this.page.getByRole('combobox').first().click()
    await this.page.getByRole('option', { name: categoria, exact: true }).click()
  }

  async filterGastosUnicosByDateRange(fechaDesde: string, fechaHasta: string) {
    await this.dateInput('Desde').fill(fechaDesde)
    await this.dateInput('Hasta').fill(fechaHasta)
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

  // ── Historial tab ──
  // GastosHistorial renders rows as plain `<button>` elements (no `tr`/
  // `div.rounded-lg` like the Unicos tab's table/cards), so it needs its own
  // locators instead of reusing gastoItem().

  async searchHistorial(term: string) {
    await this.page.getByPlaceholder('Buscar por descripción o categoría...').fill(term)
  }

  async filterHistorialByTipoOrigen(label: string) {
    await this.page.getByRole('combobox').nth(0).click()
    await this.page.getByRole('option', { name: label, exact: true }).click()
  }

  async filterHistorialByCategoria(label: string) {
    await this.page.getByRole('combobox').nth(1).click()
    await this.page.getByRole('option', { name: label, exact: true }).click()
  }

  async filterHistorialByImportancia(label: string) {
    await this.page.getByRole('button', { name: label, exact: true }).click()
  }

  async clearHistorialFilters() {
    await this.page.getByRole('button', { name: 'Limpiar todo' }).click()
  }

  async toggleHistorialGroupBy() {
    await this.page.getByTitle(/Agrupar por/).click()
  }

  async expectHistorialRowVisible(descripcion: string) {
    await expect(this.historialRow(descripcion)).toBeVisible()
  }

  async expectHistorialRowNotVisible(descripcion: string) {
    await expect(this.historialRow(descripcion)).not.toBeVisible()
  }

  async isHistorialRowVisible(descripcion: string) {
    return this.historialRow(descripcion).isVisible()
  }

  async expandHistorialRow(descripcion: string) {
    await this.historialRow(descripcion).click()
  }

  async deleteFromHistorialExpandedRow() {
    await this.page.getByRole('button', { name: 'Eliminar' }).click()
    await expect(this.page.getByRole('dialog', { name: 'Eliminar gasto' })).toBeVisible()
  }

  async confirmHistorialDelete() {
    await Promise.all([
      this.page.waitForResponse(
        (response) => response.url().includes('/gastos/') && response.request().method() === 'DELETE' && response.ok(),
      ),
      this.page.getByRole('dialog', { name: 'Eliminar gasto' }).getByRole('button', { name: 'Eliminar' }).click(),
    ])
  }

  async cancelHistorialDelete() {
    await this.page.getByRole('dialog', { name: 'Eliminar gasto' }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(this.page.getByRole('dialog', { name: 'Eliminar gasto' })).not.toBeVisible()
  }

  historialGroupHeader(label: string) {
    return this.page.locator('div.sticky').filter({ hasText: label })
  }

  async historialGroupHeaderLabelsInOrder() {
    return this.page.locator('div.sticky').allTextContents()
  }

  historialPagination() {
    // The "{page} / {totalPages}" span is a sibling of the next-page button,
    // not a descendant — go to the button's parent to reach it. A plain
    // text/regex match for "n / m" would also match each row's compact
    // "dd/MM" date span (e.g. "02/10"), so this can't use getByText directly.
    return this.historialNextPageButton().locator('xpath=../span')
  }

  async goToHistorialNextPage() {
    await this.historialNextPageButton().click()
  }

  private historialNextPageButton() {
    return this.page.getByRole('button').filter({ has: this.page.locator('svg.lucide-chevron-right') })
  }

  private historialRow(descripcion: string) {
    return this.page.locator('button').filter({ hasText: descripcion }).first()
  }

  private gastoUnicoDialog() {
    return this.page.getByRole('dialog', { name: 'Nuevo Gasto Unico' })
  }

  private gastoItem(descripcion: string) {
    return this.page.locator('tr, div.rounded-lg').filter({ hasText: descripcion }).first()
  }

  private scheduledExpenseItem(descripcion: string) {
    return this.page.locator('tr, div.rounded-lg').filter({ hasText: descripcion }).first()
  }

  private dateInput(label: 'Desde' | 'Hasta') {
    return this.page.locator('label', { hasText: label }).locator('..').locator('input[type="date"]')
  }
}
