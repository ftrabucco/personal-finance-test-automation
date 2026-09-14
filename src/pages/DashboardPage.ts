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
}
