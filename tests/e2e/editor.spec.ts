import type { Locator, Page } from '@playwright/test'
import { getArea, getProduct } from '@/config/products'
import { areaUsage } from '@/lib/design'
import { inspectPng, readPngDpi } from '@/lib/image-info'
import { printFileMatchesBox } from '@/lib/print-file'
import { expect, test } from './fixtures'
import { readCart } from './helpers/cart'

const PRICE = /^\d+,\d{2}\s€$/

/**
 * Precio total en vivo. En escritorio está en el pie del resumen lateral; en móvil, en la barra inferior. Los dos
 * son regiones `aria-live`, y son los únicos elementos de ese tipo cuyo texto es exactamente un importe.
 */
const liveTotal = (page: Page): Locator => page.locator('[aria-live="polite"]').getByText(PRICE)

/** Panel "Tu pedido" (cantidades y desglose): columna derecha en escritorio, pestaña Resumen en móvil. */
async function openSummary(page: Page): Promise<Locator> {
  const aside = page.getByRole('complementary', { name: 'Resumen del pedido' })
  if ((await aside.count()) > 0) return aside
  await page.getByRole('tab', { name: 'Resumen' }).click()
  return page.getByRole('tabpanel')
}

async function addDefaultText(page: Page) {
  await page.getByRole('tab', { name: 'Texto' }).click()
  await page.getByRole('button', { name: 'Añadir texto' }).click()
  await expect(page.getByLabel('Contenido')).toHaveValue('Tu texto')
}

test.describe('personalizador', () => {
  // Compilar el editor (Konva) la primera vez y generar los archivos lleva su tiempo en desarrollo.
  test.setTimeout(180_000)

  test('sin diseño no hay precio ni se puede añadir al carrito', async ({ page }) => {
    await page.goto('/personalizar/camiseta')
    const addToCart = page.getByRole('button', { name: 'Añadir al carrito' })
    await expect(addToCart).toBeVisible()
    await expect(addToCart).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByText('Añade una imagen, texto o pegatina a la zona de estampado.')).toBeVisible()
    await expect(liveTotal(page)).toHaveCount(0)
    // La cantidad por defecto es una unidad de la talla M (camiseta)
    const summary = await openSummary(page)
    await expect(summary.getByLabel('Cantidad de talla M')).toHaveValue('1')
  })

  test('añadir un texto muestra el precio en vivo, el tamaño cambia el escalón y 5 unidades aplican el 5 %', async ({ page }) => {
    await page.goto('/personalizar/camiseta')
    await addDefaultText(page)

    // Con el texto por defecto ya hay precio: camiseta (8,90 €) + estampado del frente
    await expect(liveTotal(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Añadir al carrito' })).not.toHaveAttribute('aria-disabled', 'true')

    // Un texto diminuto ocupa menos de 100 cm²: escalón mínimo del frente (2,50 €)
    const size = page.getByLabel('Tamaño (cm)')
    await size.fill('0,5')
    await expect(liveTotal(page)).toHaveText('11,40 €')

    // Un texto enorme se recorta a la zona entera (30 × 40 cm = 1200 cm²): escalón máximo (10,00 €)
    await size.fill('40')
    await expect(liveTotal(page)).toHaveText('18,90 €')

    // Vuelta a un tamaño normal con un texto corto: de nuevo el escalón mínimo
    await page.getByLabel('Contenido').fill('HOLA')
    await size.fill('4')
    await expect(liveTotal(page)).toHaveText('11,40 €')

    // 5 unidades: 5 × 11,40 = 57,00 − 5 % = 54,15
    const summary = await openSummary(page)
    await summary.getByLabel('Cantidad de talla M').fill('5')
    await expect(summary.getByText('Total: 5 unidades')).toBeVisible()
    await expect(summary.getByText(/Descuento por volumen \(5\s*%\)/)).toBeVisible()
    await expect(summary.getByText('−2,85 €')).toBeVisible()
    await expect(liveTotal(page)).toHaveText('54,15 €')
  })

  test('deshacer y rehacer recuperan el diseño (y con él el precio)', async ({ page }) => {
    await page.goto('/personalizar/camiseta')
    await addDefaultText(page)
    await expect(liveTotal(page)).toBeVisible()
    await page.getByRole('button', { name: 'Deshacer (Ctrl+Z)' }).click()
    await expect(liveTotal(page)).toHaveCount(0)
    await expect(page.getByText('Añade una imagen, texto o pegatina a la zona de estampado.')).toBeVisible()
    await page.getByRole('button', { name: 'Rehacer (Ctrl+Mayús+Z)' }).click()
    await expect(liveTotal(page)).toBeVisible()
  })

  test('el borrador se conserva al recargar la página', async ({ page }) => {
    await page.goto('/personalizar/camiseta')
    await addDefaultText(page)
    await page.getByLabel('Contenido').fill('Mi borrador')
    await expect(liveTotal(page)).toBeVisible()
    // El borrador se guarda al salir de la página (pagehide) o 600 ms después del último cambio
    await page.reload()
    await expect(liveTotal(page)).toBeVisible()
    await page.getByRole('tab', { name: 'Capas' }).click()
    await expect(page.getByRole('tabpanel')).toContainText('Mi borrador')
  })

  test('añadir al carrito genera la vista previa y un PNG de impresión a 300 ppp que cuadra con el diseño', async ({ page }) => {
    await page.goto('/personalizar/camiseta')
    await addDefaultText(page)
    await page.getByLabel('Contenido').fill('HOLA')
    await page.getByLabel('Tamaño (cm)').fill('4')
    await expect(liveTotal(page)).toHaveText('11,40 €')
    const summary = await openSummary(page)
    await summary.getByLabel('Cantidad de talla M').fill('5')
    await expect(liveTotal(page)).toHaveText('54,15 €')

    await page.getByRole('button', { name: 'Añadir al carrito' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: '¡Añadido al carrito!' })).toBeVisible({ timeout: 120_000 })
    const preview = dialog.getByRole('img', { name: 'Vista previa de tu diseño' })
    await expect(preview).toBeVisible()
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)

    // Lo que ha quedado guardado en el carrito
    const [line] = await readCart(page)
    expect(line).toBeDefined()
    expect(line.productId).toBe('camiseta')
    expect(line.sizes).toEqual({ M: 5 })
    expect(line.previews.front).toMatch(/^[a-z0-9]{12,40}$/)
    expect(line.printFiles.frente).toMatch(/^[a-z0-9]{12,40}$/)
    const layer = line.design.areas.frente.layers[0]
    expect(layer.type === 'text' && layer.text).toBe('HOLA')

    // La vista previa es una imagen servida por la tienda
    const previewRes = await page.request.get(`/api/files/${line.previews.front}`)
    expect(previewRes.status()).toBe(200)
    expect(previewRes.headers()['content-type']).toMatch(/^image\//)

    // El PNG de impresión: válido, a 300 ppp anotados y con el tamaño de la caja que se cobra (la misma comprobación que hace el servidor)
    const printRes = await page.request.get(`/api/files/${line.printFiles.frente}`)
    expect(printRes.status()).toBe(200)
    expect(printRes.headers()['content-type']).toBe('image/png')
    const png = new Uint8Array(await printRes.body())
    const info = inspectPng(png)
    expect(info).not.toBeNull()
    expect(readPngDpi(png.subarray(0, 96))).toBe(300)
    const area = getArea(getProduct('camiseta')!, 'frente')!
    const { bbox } = areaUsage(line.design.areas.frente.layers, area)
    expect(bbox).not.toBeNull()
    expect(printFileMatchesBox(info!, bbox!.x1 - bbox!.x0, bbox!.y1 - bbox!.y0)).toBe(true)

    // Y en el carrito aparece la línea con sus 5 unidades
    await dialog.getByRole('link', { name: 'Ir al carrito' }).click()
    await expect(page).toHaveURL(/\/carrito$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Camiseta' })).toBeVisible()
    await expect(page.getByText('Subtotal · 5 unidades')).toBeVisible()
    await expect(page.getByText(/Importe de la línea:\s*54,15\s€/)).toBeVisible()
  })
})
