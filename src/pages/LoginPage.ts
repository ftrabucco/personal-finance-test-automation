import { expect, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/login')
  }

  async expectLoaded() {
    await expect(this.page.getByText('Finanzas Personales').first()).toBeVisible()
    await expect(this.page.getByLabel('Email')).toBeVisible()
    await expect(this.page.getByLabel('Contraseña')).toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email)
    await this.page.getByLabel('Contraseña').fill(password)
    await this.page.getByRole('button', { name: 'Iniciar Sesión' }).click()
  }
}

