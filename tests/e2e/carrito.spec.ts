import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { buildCartLine, readCart, seedCart } from './helpers/cart'

/** Valor de una fila del resumen ("Subtotal", "Envío (estimado)", "Total"…). */
const summaryValue = (page: Page, label: string | RegExp) =>
  page.getByRole('complementary', { name: 'Resumen' }).locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]')

test.describe('carrito', () => {
  test.beforeEach(async ({ page }) => {
    await seedCart(page, [await buildCartLine(page.request, { sizes: { M: 1 } })])
  })

  test('muestra la línea con su precio y permite cambiar unidades por talla sin bajar de una', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Camiseta' })).toBeVisible()
    await expect(page.getByText('Blanco', { exact: true })).toBeVisible()
    await expect(page.getByText(/Importe de la línea:\s*11,40\s€/)).toBeVisible()
    await expect(summaryValue(page, 'Subtotal · 1 unidad')).toHaveText('11,40 €')
    await expect(summaryValue(page, /^Envío/)).toHaveText('4,95 €')
    await expect(summaryValue(page, /^Total$/)).toHaveText('16,35 €')

    await page.getByRole('button', { name: 'Añadir una unidad, talla L' }).click()
    await expect(page.getByText(/Importe de la línea:\s*22,80\s€/)).toBeVisible()
    await expect(summaryValue(page, 'Subtotal · 2 unidades')).toHaveText('22,80 €')

    await page.getByRole('button', { name: 'Quitar una unidad, talla M' }).click()
    await expect(page.getByText(/Importe de la línea:\s*11,40\s€/)).toBeVisible()
    // Con una sola unidad en la línea no se puede quitar la última
    await expect(page.getByRole('button', { name: 'Quitar una unidad, talla L' })).toBeDisabled()

    // Lo que se ve es lo que queda guardado
    const [line] = await readCart(page)
    expect(line.sizes).toEqual({ L: 1 })
  })

  test('a partir de 5 unidades aplica el descuento por volumen y dice cuánto falta para el envío gratis', async ({ page }) => {
    await page.getByLabel('Unidades, talla M').fill('5')
    await expect(page.getByText(/Descuento por cantidad \(5\s*%\)/)).toBeVisible()
    await expect(page.getByText('−2,85 €')).toBeVisible()
    await expect(page.getByText(/Importe de la línea:\s*54,15\s€/)).toBeVisible()
    await expect(summaryValue(page, /^Total$/)).toHaveText('59,10 €')
    await expect(page.getByText('Te faltan 5,85 € para el envío gratis')).toBeVisible()
    const progress = page.getByRole('progressbar', { name: /envío gratis/ })
    await expect(progress).toHaveAttribute('aria-valuenow', '90')
  })

  test('desde 60 € el envío es gratis', async ({ page }) => {
    await page.getByLabel('Unidades, talla M').fill('6')
    // 6 × 11,40 = 68,40 − 5 % = 64,98
    await expect(page.getByText(/Importe de la línea:\s*64,98\s€/)).toBeVisible()
    await expect(summaryValue(page, /^Envío/)).toHaveText('Gratis')
    await expect(summaryValue(page, /^Total$/)).toHaveText('64,98 €')
    await expect(page.getByText('¡Tienes el envío gratis!')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: /envío gratis/ })).toHaveAttribute('aria-valuenow', '100')
  })

  test('quitar la única línea deja el carrito vacío y el enlace de la cabecera lo refleja', async ({ page }) => {
    await page.getByRole('button', { name: /^Quitar\s*:\s*Camiseta · Blanco$/ }).click()
    await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver productos' })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: /^Carrito, vacío$/ })).toBeVisible()
    expect(await readCart(page)).toEqual([])
  })

  test('el carrito sobrevive a una recarga y "Tramitar pedido" lleva al checkout', async ({ page }) => {
    await page.reload()
    await expect(page.getByRole('heading', { level: 2, name: 'Camiseta' })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: /^Carrito, 1 unidad$/ })).toBeVisible()
    await page.getByRole('link', { name: 'Tramitar pedido' }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Finalizar pedido' })).toBeVisible()
  })

  test('"Editar diseño" abre el editor con la línea cargada', async ({ page }) => {
    const [line] = await readCart(page)
    await page.getByRole('link', { name: /^Editar diseño/ }).click()
    await expect(page).toHaveURL(new RegExp(`/personalizar/camiseta\\?color=blanco&linea=${line.id}$`))
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
  })
})

test('con el carrito vacío se ofrece ir a los productos', async ({ page }) => {
  await page.goto('/carrito')
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible()
  await page.getByRole('link', { name: 'Ver productos' }).click()
  await expect(page).toHaveURL(/\/productos$/)
})
