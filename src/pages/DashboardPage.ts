import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/')
  }

  async expectLoaded() {
    await expect(this.page.getByText(/Hola,/)).toBeVisible()
  }

  async expectMainFinancialCardsVisible() {
    await expect(this.page.getByText('Gastos del Mes')).toBeVisible()
    await expect(this.page.getByText('Ingresos del Mes')).toBeVisible()
    await expect(this.page.getByText('Balance Neto')).toBeVisible()
  }

  async getFinancialCardAmountTitle(title: 'Gastos del Mes' | 'Ingresos del Mes' | 'Balance Neto') {
    const card = this.page
      .getByText(title, { exact: true })
      .locator('xpath=ancestor::*[contains(@class, "overflow-hidden")][1]')
    const amountTitle = await card.locator('[title]').first().getAttribute('title')

    if (!amountTitle) {
      throw new Error(`Could not find amount title for dashboard card: ${title}`)
    }

    return amountTitle
  }

  // ── Dashboard personalization (CF-CONF-003) ──

  async openPersonalizar() {
    await this.page.getByRole('button', { name: 'Personalizar' }).click()
    await expect(this.page.getByRole('heading', { name: 'Personalizar Dashboard' })).toBeVisible()
  }

  async closePersonalizar() {
    await this.page.keyboard.press('Escape')
    await expect(this.page.getByRole('heading', { name: 'Personalizar Dashboard' })).not.toBeVisible()
  }

  /** Must be called with the Personalizar sheet open (see openPersonalizar()). */
  async toggleDashboardSection(sectionLabel: string) {
    await this.page.getByRole('switch', { name: sectionLabel }).click()
  }

  /** Must be called with the Personalizar sheet closed — its labels share text with the section headings. */
  async expectDashboardSectionVisible(sectionLabel: string) {
    await expect(this.page.getByText(sectionLabel, { exact: true })).toBeVisible()
  }

  async expectDashboardSectionNotVisible(sectionLabel: string) {
    await expect(this.page.getByText(sectionLabel, { exact: true })).not.toBeVisible()
  }

  async expectRecentExpenseVisible(descripcion: string) {
    await expect(
      this.page
        .getByText('Gastos Recientes', { exact: true })
        .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
        .getByText(descripcion),
    ).toBeVisible()
  }
}
