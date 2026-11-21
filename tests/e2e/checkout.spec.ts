import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { buildCartLine, checkoutPayload, readCart, seedCart, uniqueEmail } from './helpers/cart'

const PAY_BUTTON = 'Pedido con obligación de pago (modo demostración)'

/** Valor de una fila del resumen "Tu pedido" del checkout. */
const summaryValue = (page: Page, label: string | RegExp) =>
  page.getByRole('complementary', { name: 'Tu pedido' }).locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]')

async function fillCustomer(page: Page, email: string) {
  await page.getByLabel('Nombre y apellidos').fill('Ana Prueba')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Teléfono').fill('600 112 233')
  // El nombre de quien recibe sigue al nombre de contacto hasta que se toque
  await expect(page.getByLabel('Nombre de quien recibe')).toHaveValue('Ana Prueba')
  await page.getByLabel(/^Dirección/).fill('Calle Mayor 1')
  await page.getByLabel('Localidad').fill('Madrid')
}

async function acceptConsents(page: Page) {
  for (const name of [/acepto las condiciones de venta/, /He leído la política de privacidad/, /derecho de desistimiento/, /Tengo derecho a usar los diseños/]) {
    await page.getByRole('checkbox', { name }).check()
  }
}

test.describe('checkout', () => {
  test.beforeEach(async ({ page }) => {
    await seedCart(page, [await buildCartLine(page.request, { sizes: { M: 1 } })], '/checkout')
    await expect(page.getByRole('heading', { level: 1, name: 'Finalizar pedido' })).toBeVisible()
  })

  test('un pedido completo en modo demostración termina en la página del pedido y vacía el carrito', async ({ page }) => {
    const email = uniqueEmail('checkout')
    await fillCustomer(page, email)
    await page.getByLabel('Código postal').fill('28001')
    // La provincia se rellena sola con el código postal y el envío deja de ser una estimación
    await expect(page.getByLabel('Provincia')).toHaveValue('Madrid')
    await expect(summaryValue(page, /^Envío$/)).toHaveText('4,95 €')
    await expect(summaryValue(page, /^Total$/)).toHaveText('16,35 €')
    await acceptConsents(page)
    await expect(page.getByText(/Al pulsar el botón de pago realizas un pedido con obligación de pago de 16,35\s€/)).toBeVisible()

    await page.getByRole('button', { name: PAY_BUTTON }).click()
    await page.waitForURL(/\/pedido\/[a-z0-9]{12,40}\?t=[a-z0-9]{10,}/)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Ana!' })).toBeVisible()
    await expect(page.getByText('Pago recibido', { exact: true })).toBeVisible()
    await expect(page.getByText(/Pedido de demostración: el pago ha sido simulado/)).toBeVisible()
    await expect(page.getByText(/Tu pedido PU-\d{4,} está confirmado/)).toBeVisible()
    await expect(page.getByText(`Te hemos enviado la confirmación a ${email}`)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Tu pedido' }).locator('dt:text-is("Total") + dd')).toHaveText('16,35 €')
    await expect(page.getByRole('region', { name: 'Envío' })).toContainText('28001 Madrid (Madrid)')
    // El carrito queda vacío tras pagar
    expect(await readCart(page)).toEqual([])
  })

  test('sin rellenar nada, señala los errores, enfoca el primero y no crea ningún pedido', async ({ page }) => {
    await page.getByRole('button', { name: PAY_BUTTON }).click()
    for (const message of [
      'Escribe tu nombre y apellidos.',
      'Introduce tu email',
      'Introduce un teléfono de contacto',
      'Introduce tu código postal de 5 dígitos.',
      'Debes aceptar las condiciones de venta para continuar.',
    ]) {
      await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible()
    }
    await expect(page.locator('[aria-invalid="true"]').first()).toBeFocused()
    await expect(page).toHaveURL(/\/checkout$/)
  })

  test('rechaza los códigos postales de Canarias, Ceuta y Melilla antes de pagar', async ({ page }) => {
    await fillCustomer(page, uniqueEmail('canarias'))
    await page.getByLabel('Código postal').fill('35001')
    await expect(page.getByText(/Aún no enviamos a Canarias, Ceuta y Melilla desde la tienda online\./)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Escríbenos' })).toBeVisible()
    // La provincia no se autocompleta y el envío no se puede calcular
    await expect(page.getByLabel('Provincia')).toHaveValue('')
    await expect(summaryValue(page, /^Envío/)).toHaveText('—')
    await acceptConsents(page)
    await page.getByRole('button', { name: PAY_BUTTON }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByText(/Aún no enviamos a Canarias, Ceuta y Melilla/).first()).toBeVisible()
  })

  test('Baleares lleva 3 € de suplemento de envío hasta la página del pedido', async ({ page }) => {
    await fillCustomer(page, uniqueEmail('baleares'))
    await page.getByLabel('Código postal').fill('07001')
    await page.getByLabel('Localidad').fill('Palma')
    await expect(page.getByLabel('Provincia')).toHaveValue('Illes Balears')
    await expect(summaryValue(page, /^Envío$/)).toHaveText('7,95 €')
    await expect(summaryValue(page, /^Total$/)).toHaveText('19,35 €')
    await acceptConsents(page)
    await page.getByRole('button', { name: PAY_BUTTON }).click()
    await page.waitForURL(/\/pedido\//)
    const items = page.getByRole('region', { name: 'Tu pedido' })
    await expect(items.locator('dt:text-is("Envío") + dd')).toHaveText('7,95 €')
    await expect(items.locator('dt:text-is("Total") + dd')).toHaveText('19,35 €')
  })

  test('comprar como empresa exige empresa y NIF/CIF, que aparecen en el pedido', async ({ page }) => {
    await fillCustomer(page, uniqueEmail('empresa'))
    await page.getByLabel('Código postal').fill('28001')
    await page.getByRole('checkbox', { name: /Compro como empresa o autónomo/ }).check()
    await acceptConsents(page)
    await page.getByRole('button', { name: PAY_BUTTON }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Escribe el nombre de la empresa para la factura.' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Escribe el NIF/CIF para la factura.' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Empresa' }).fill('Bar La Esquina')
    await page.getByLabel('NIF / CIF').fill('b87654321')
    await expect(page.getByLabel('NIF / CIF')).toHaveValue('B87654321')
    await page.getByRole('button', { name: PAY_BUTTON }).click()
    await page.waitForURL(/\/pedido\//)
    await expect(page.getByText('Datos de facturación: Bar La Esquina · B87654321')).toBeVisible()
  })
})

test.describe('el servidor valida y recalcula por su cuenta', () => {
  test('rechaza una provincia que no coincide con el código postal', async ({ page }) => {
    const line = await buildCartLine(page.request)
    const res = await page.request.post('/api/checkout', { data: checkoutPayload(line, { province: 'Barcelona' }) })
    expect(res.status()).toBe(422)
    const body = (await res.json()) as { code: string; fieldErrors?: Record<string, string> }
    expect(body.code).toBe('validation')
    expect(body.fieldErrors?.['shipping.province']).toBe('La provincia no coincide con el código postal.')
  })

  test('rechaza un código postal sin envío aunque el navegador lo deje pasar', async ({ page }) => {
    const line = await buildCartLine(page.request)
    const res = await page.request.post('/api/checkout', { data: checkoutPayload(line, { postalCode: '35001', city: 'Las Palmas', province: 'Las Palmas' }) })
    expect(res.status()).toBe(422)
    const body = (await res.json()) as { fieldErrors?: Record<string, string> }
    expect(body.fieldErrors?.['shipping.postalCode']).toMatch(/Aún no enviamos a Canarias, Ceuta y Melilla/)
  })

  test('rechaza una línea sin unidades y una línea con un archivo de impresión que no cuadra con el diseño', async ({ page }) => {
    const line = await buildCartLine(page.request)
    const sinUnidades = await page.request.post('/api/checkout', { data: checkoutPayload({ ...line, sizes: { M: 0 } }) })
    expect(sinUnidades.status()).toBe(422)
    expect(((await sinUnidades.json()) as { code: string }).code).toBe('line_invalid')

    // Declarar un diseño pequeño y adjuntar el PNG de otra caja (aquí, la vista previa de 300 × 350 px) no cuela
    const archivoFalso = await page.request.post('/api/checkout', { data: checkoutPayload({ ...line, printFiles: { frente: line.previews.front } }) })
    expect(archivoFalso.status()).toBe(422)
    expect(((await archivoFalso.json()) as { error: string }).error).toMatch(/no son válidos|no se corresponde con el diseño/)
  })

  test('el precio lo pone el servidor: el total del pedido no depende de nada que envíe el navegador', async ({ page }) => {
    const line = await buildCartLine(page.request, { sizes: { M: 5 } })
    const payload = { ...checkoutPayload(line, { postalCode: '07001', city: 'Palma', province: 'Illes Balears' }), totalCents: 1, subtotalCents: 1 }
    const created = await page.request.post('/api/checkout', { data: payload })
    expect(created.ok()).toBe(true)
    const { orderId } = (await created.json()) as { orderId: string }
    const paid = await page.request.post('/api/checkout/demo-pay', { data: { orderId } })
    const { redirect } = (await paid.json()) as { redirect: string }
    await page.goto(redirect)
    const items = page.getByRole('region', { name: 'Tu pedido' })
    // 5 × 11,40 − 5 % = 54,15 + envío a Baleares 7,95 = 62,10
    await expect(items.locator('dt:text-is("Subtotal") + dd')).toHaveText('54,15 €')
    await expect(items.locator('dt:text-is("Envío") + dd')).toHaveText('7,95 €')
    await expect(items.locator('dt:text-is("Total") + dd')).toHaveText('62,10 €')
  })
})
