import type { Locator, Page } from '@playwright/test'

export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  async goto(path: string) {
    await this.page.goto(path)
  }

  protected async selectSearchableOption(container: Locator, index: number, optionName: string) {
    await container.getByRole('combobox').nth(index).click()
    await this.page.getByRole('option', { name: optionName, exact: true }).click()
  }
}
