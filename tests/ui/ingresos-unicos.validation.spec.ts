import { test, expect } from '@fixtures/test'
import { didSendRequest, isPostTo } from '@utils/network'

test.describe('Ingresos unicos UI validation @smoke @smoke-readonly @ui @ingresos @P0', () => {
  test('CF-INC-VAL-001 blocks empty ingreso unico submission on the client side', async ({
    authenticatedPage,
    ingresosPage,
  }) => {
    await authenticatedPage.goto('/')
    await ingresosPage.gotoUnicos()
    await ingresosPage.expectLoaded()
    await ingresosPage.openNewIngresoUnicoDialog()

    const createRequest = didSendRequest(authenticatedPage, isPostTo('/ingresos-unicos'))

    await ingresosPage.submitIngresoUnicoForm()

    await ingresosPage.expectIngresoUnicoDialogVisible()
    await ingresosPage.expectIngresoUnicoValidationErrors()
    await expect(createRequest).resolves.toBe(false)
  })
})
