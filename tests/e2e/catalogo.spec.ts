import { expect, test } from './fixtures'

test.describe('catálogo', () => {
  test('lista los cuatro productos con su precio "desde" y acceso directo al personalizador', async ({ page }) => {
    await page.goto('/productos')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Elige qué quieres')
    await expect(page.getByText('(4 productos)')).toBeVisible()
    // Precio "desde" = producto + la zona de estampado más barata (el pecho de 2,00 € en la camiseta)
    for (const [name, from] of [
      ['camiseta', '10,90 €'],
      ['sudadera con capucha', '24,40 €'],
      ['gorra', '10,40 €'],
      ['taza', '7,40 €'],
    ] as const) {
      await expect(page.getByRole('link', { name: `Personalizar ${name}` })).toHaveAttribute('href', /^\/personalizar\//)
      await expect(page.getByText(from, { exact: true })).toBeVisible()
    }
  })

  test('el filtro por categoría reduce la lista', async ({ page }) => {
    await page.goto('/productos?categoria=ropa')
    await expect(page.getByRole('heading', { level: 2, name: /^Ropa/ })).toBeVisible()
    await expect(page.getByText('(2 productos)')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Personalizar camiseta' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Personalizar taza' })).toHaveCount(0)
  })

  test('la ficha de la camiseta muestra precio, colores, zonas y datos estructurados, y lleva al editor con el color elegido', async ({ page }) => {
    await page.goto('/productos/camisetas-personalizadas')
    await expect(page.getByRole('heading', { level: 1, name: 'Camisetas personalizadas' })).toBeVisible()
    await expect(page.getByText('10,90 €', { exact: true })).toBeVisible()
    await expect(page.getByText(/Tallas:\s*XS · S · M · L · XL · XXL/)).toBeVisible()

    const colorGroup = page.getByRole('group', { name: /^Color:/ })
    await expect(colorGroup.getByRole('button', { name: 'Blanco', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await colorGroup.getByRole('button', { name: 'Negro', exact: true }).click()
    await expect(colorGroup.getByRole('button', { name: 'Negro', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(colorGroup).toContainText('Color: Negro')

    const personalize = page.getByRole('link', { name: 'Personalizar camiseta' }).first()
    await expect(personalize).toHaveAttribute('href', '/personalizar/camiseta?color=negro')

    for (const title of ['Cómo se calcula el precio', 'Zonas de estampado', 'Ficha técnica y cuidados', 'Cuándo lo recibes']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
    }
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(jsonLd.some((t) => /"@type":\s*"Product"/.test(t) && t.includes('"sku":"camiseta"'))).toBe(true)

    // Al editor, con el color elegido ya aplicado
    await personalize.click()
    await expect(page).toHaveURL(/\/personalizar\/camiseta\?color=negro$/)
    await expect(page.getByRole('group', { name: /^Lienzo de camiseta/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Negro', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('la ficha de la taza enseña el suplemento del interior de color y la capacidad en lugar de la talla', async ({ page }) => {
    await page.goto('/productos/tazas-personalizadas')
    await expect(page.getByRole('heading', { level: 1, name: 'Tazas personalizadas' })).toBeVisible()
    await expect(page.getByText(/Capacidad:\s*330 ml/)).toBeVisible()
    const colorGroup = page.getByRole('group', { name: /^Color del interior/ })
    await expect(colorGroup.getByRole('button', { name: /Interior y asa rosa/ })).toContainText('+1,50 €')
  })

  test('un producto que no existe responde 404', async ({ page }) => {
    const response = await page.goto('/productos/bolsas-personalizadas')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Esta página se ha perdido' })).toBeVisible()
  })
})
