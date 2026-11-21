import { expect, test } from './fixtures'
import { createPaidOrder } from './helpers/orders'

test.describe('seguimiento de pedido', () => {
  test('con número de pedido y email lleva a la página del pedido', async ({ page }) => {
    const order = await createPaidOrder(page.request, { name: 'Marta Ruiz' })
    await page.goto('/seguimiento')
    await expect(page.getByRole('heading', { level: 1, name: 'Seguimiento de pedido' })).toBeVisible()
    await page.getByLabel('Número de pedido').fill(order.number.toLowerCase())
    await page.getByLabel('Email del pedido').fill(order.email.toUpperCase())
    await page.getByRole('button', { name: 'Ver mi pedido' }).click()
    await expect(page).toHaveURL(new RegExp(`/pedido/${order.orderId}\\?t=${order.token}$`))
    await expect(page.getByText(new RegExp(`Tu pedido ${order.number} está confirmado`))).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Marta!' })).toBeVisible()
  })

  test('con un email que no coincide responde con un mensaje genérico (no revela si el pedido existe)', async ({ page }) => {
    const order = await createPaidOrder(page.request)
    await page.goto('/seguimiento')
    await page.getByLabel('Número de pedido').fill(order.number)
    await page.getByLabel('Email del pedido').fill('otra-persona@e2e.example')
    await page.getByRole('button', { name: 'Ver mi pedido' }).click()
    // Next añade un anunciador de rutas con role="alert": se filtra por el texto
    await expect(page.getByRole('alert').filter({ hasText: 'No hemos encontrado ningún pedido con esos datos' })).toBeVisible()
    await expect(page).toHaveURL(/\/seguimiento$/)
  })

  test('valida el formato del número y del email antes de consultar', async ({ page }) => {
    await page.goto('/seguimiento')
    await page.getByLabel('Número de pedido').fill('pedido 12')
    await page.getByLabel('Email del pedido').fill('no-es-un-email')
    await page.getByRole('button', { name: 'Ver mi pedido' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Escribe el número de pedido, por ejemplo PU-1042.' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Introduce el email que usaste al comprar.' })).toBeVisible()
  })

  test('el enlace del pedido sin el token correcto responde 404', async ({ page }) => {
    const order = await createPaidOrder(page.request)
    const withoutToken = await page.goto(`/pedido/${order.orderId}`)
    expect(withoutToken?.status()).toBe(404)
    const wrongToken = await page.goto(`/pedido/${order.orderId}?t=${'x'.repeat(28)}`)
    expect(wrongToken?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Esta página se ha perdido' })).toBeVisible()
    const right = await page.goto(order.pagePath)
    expect(right?.status()).toBe(200)
  })

  test('la página del pedido muestra estado, productos y dirección', async ({ page }) => {
    const order = await createPaidOrder(page.request, { sizes: { M: 2, L: 1 }, note: 'Entregar por la tarde' })
    await page.goto(order.pagePath)
    await expect(page.getByText('Pagado', { exact: true })).toBeVisible()
    const items = page.getByRole('region', { name: 'Tu pedido' })
    await expect(items.getByText('Camiseta', { exact: true })).toBeVisible()
    await expect(items.getByText('2 × M · 1 × L')).toBeVisible()
    await expect(items.locator('dt:text-is("Subtotal") + dd')).toHaveText('34,20 €')
    await expect(page.getByRole('region', { name: 'Envío' })).toContainText('Calle Mayor 1')
    await expect(page.getByText('Tu nota: Entregar por la tarde')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Estado del pedido' })).toBeVisible()
  })
})
