import { test } from '@fixtures/test'
import {
  expectListDoesNotContainItem,
  expectListContainsItem,
  expectSuccessfulResponses,
} from '@assertions/apiAssertions'
import { isDestructiveTestsAllowed, requireDestructiveTestsAllowed } from '@config/safety'

test.describe('Ingresos unicos UI destructive @destructive @ui @ingresos @P0', () => {
  test.skip(!isDestructiveTestsAllowed(), 'Destructive tests require local/staging and ALLOW_DESTRUCTIVE_TESTS=true')

  test('CF-INC-001 creates, verifies and deletes an ingreso unico from UI', async ({
    authenticatedPage,
    authSession,
    financeTestDataFactory,
    ingresosUnicosApi,
    ingresosPage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Destructive UI flow runs once to avoid duplicated data')
    requireDestructiveTestsAllowed()

    const { payload: ingreso, uiOptions } = await financeTestDataFactory.ingresoUnicoForUi(authSession.token)

    let createdIds: number[] = []

    try {
      await authenticatedPage.goto('/')
      await ingresosPage.gotoUnicos()
      await ingresosPage.expectLoaded()
      await ingresosPage.openNewIngresoUnicoDialog()

      await ingresosPage.createIngresoUnico(ingreso, uiOptions)

      await ingresosPage.expectIngresoVisible(ingreso.descripcion)

      createdIds = await ingresosUnicosApi.findIdsByDescription(authSession.token, ingreso.descripcion)
      expectListContainsItem(
        createdIds,
        (id) => Number.isInteger(id),
        'Expected UI-created ingreso unico to exist by description.',
      )

      await ingresosPage.deleteIngreso(ingreso.descripcion)
      await ingresosPage.expectIngresoNotVisible(ingreso.descripcion)

      createdIds = await ingresosUnicosApi.findIdsByDescription(authSession.token, ingreso.descripcion)
      expectListDoesNotContainItem(
        createdIds,
        (id) => Number.isInteger(id),
        'Expected UI-deleted ingreso unico to be absent by description.',
      )
    } finally {
      const deleteResponses = await ingresosUnicosApi.deleteMany(authSession.token, createdIds)
      await expectSuccessfulResponses(deleteResponses)
    }
  })
})
