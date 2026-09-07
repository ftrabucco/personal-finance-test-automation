import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class PerfilPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/perfil')
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible()
    await expect(this.page.getByText('Administra tu información personal y seguridad')).toBeVisible()
    await expect(this.page.getByText('Información Personal', { exact: true })).toBeVisible()
    await expect(this.page.locator('div').filter({ hasText: /^Cambiar Contraseña$/ }).first()).toBeVisible()
  }
}
