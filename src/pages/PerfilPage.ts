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

  async expectAccountData(expected: { id: number; nombre: string; email: string }) {
    await expect(this.page.getByLabel('Nombre')).toHaveValue(expected.nombre)
    await expect(this.page.getByLabel('Email')).toHaveValue(expected.email)
    await expect(this.page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible()
    await expect(this.page.getByText(`ID de usuario: ${expected.id}`)).toBeVisible()
  }

  async expectPasswordSectionReadOnlyInitialState() {
    await expect(this.page.getByLabel('Contraseña Actual')).toHaveValue('')
    await expect(this.page.getByLabel('Nueva Contraseña', { exact: true })).toHaveValue('')
    await expect(this.page.getByLabel('Confirmar Nueva Contraseña')).toHaveValue('')
    await expect(this.page.getByRole('button', { name: 'Cambiar Contraseña' })).toBeDisabled()
  }
}
