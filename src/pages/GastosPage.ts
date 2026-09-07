import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class GastosPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/gastos')
  }

  async expectLoaded() {
    const main = this.page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Gastos' })).toBeVisible()
    await expect(this.page.getByText('Gestiona todos tus gastos desde un solo lugar')).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Historial' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: /Unicos|Únicos/ })).toBeVisible()
  }
}
