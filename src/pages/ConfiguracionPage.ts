import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class ConfiguracionPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/configuracion')
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'Configuracion' })).toBeVisible()
    await expect(this.page.getByText('Personaliza tus categorias de gastos y fuentes de ingreso')).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'General' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Modulos' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Categorias' })).toBeVisible()
    await expect(this.page.getByRole('tab', { name: 'Fuentes' })).toBeVisible()
  }

  async openModulosTab() {
    await this.page.getByRole('tab', { name: 'Modulos' }).click()
    await expect(this.page.getByText('Modulos de la Aplicacion')).toBeVisible()
  }

  async expectModuleStateVisible() {
    await expect(this.page.getByText('Modulos Principales (siempre activos)')).toBeVisible()
    await expect(this.page.getByText('Modulos Opcionales')).toBeVisible()
    await expect(this.page.getByText('Core').first()).toBeVisible()
    await expect(this.page.getByRole('switch').first()).toBeVisible()
    await expect(this.page.getByText('Tip:')).toBeVisible()
  }
}
