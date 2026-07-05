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
}

