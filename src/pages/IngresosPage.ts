import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class IngresosPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/ingresos')
  }

  async expectLoaded() {
    const main = this.page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Ingresos' })).toBeVisible()
    await expect(this.page.getByText('Gestiona todos tus ingresos')).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Historial' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: /Unicos|Únicos/ })).toBeVisible()
  }
}
