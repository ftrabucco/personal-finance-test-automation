import { test } from '@fixtures/test'
import {
  expectListDoesNotContainItem,
  expectListContainsItem,
  expectSuccessfulResponses,
} from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'

test.describe('Gastos unicos UI destructive @destructive @ui @gastos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-EXP-001 creates, verifies and deletes a gasto unico from UI', async ({
    authenticatedPage,
    authSession,
    financeTestDataFactory,
    gastosUnicosApi,
    gastosPage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()
    test.fail(true, 'BUG-2026-004: UI keeps a deleted gasto unico visible after DELETE succeeds.')

    const { payload: gasto, uiOptions } = await financeTestDataFactory.gastoUnicoForUi(authSession.token)

    let createdIds: number[] = []

    try {
      await authenticatedPage.goto('/')
      await gastosPage.gotoUnicos()
      await gastosPage.expectLoaded()
      await gastosPage.openNewGastoUnicoDialog()

      await gastosPage.createGastoUnico(gasto, uiOptions)

      await gastosPage.expectGastoVisible(gasto.descripcion)

      createdIds = await gastosUnicosApi.findIdsByDescription(authSession.token, gasto.descripcion)
      expectListContainsItem(
        createdIds,
        (id) => Number.isInteger(id),
        'Expected UI-created gasto unico to exist by description.',
      )

      await gastosPage.deleteGasto(gasto.descripcion)
      await gastosPage.expectGastoNotVisible(gasto.descripcion)

      createdIds = await gastosUnicosApi.findIdsByDescription(authSession.token, gasto.descripcion)
      expectListDoesNotContainItem(
        createdIds,
        (id) => Number.isInteger(id),
        'Expected UI-deleted gasto unico to be absent by description.',
      )
    } finally {
      const deleteResponses = await gastosUnicosApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })
})
