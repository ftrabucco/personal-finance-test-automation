import { test, expect } from '@fixtures/test'
import { didSendRequest, isPostTo } from '@utils/network'

test.describe('Gastos unicos UI validation @smoke @smoke-readonly @ui @gastos @P0', () => {
  test('CF-EXP-VAL-001 blocks empty gasto unico submission on the client side', async ({
    authenticatedPage,
    gastosPage,
  }) => {
    await authenticatedPage.goto('/')
    await gastosPage.gotoUnicos()
    await gastosPage.expectLoaded()
    await gastosPage.openNewGastoUnicoDialog()

    const createRequest = didSendRequest(authenticatedPage, isPostTo('/gastos-unicos'))

    await gastosPage.submitGastoUnicoForm()

    await gastosPage.expectGastoUnicoDialogVisible()
    await gastosPage.expectGastoUnicoValidationErrors()
    await expect(createRequest).resolves.toBe(false)
  })
})
