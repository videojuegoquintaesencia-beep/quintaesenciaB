import { expect, isMobile, test } from './fixtures'
import { collectConsoleErrors } from './helpers/console'

test.describe('portada y navegación', () => {
  test('la portada responde 200, tiene título y encabezado y no deja errores en la consola', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Pieza Única/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    // La cabecera ya se ha hidratado (el enlace del carrito es un componente cliente que anuncia su estado)
    await expect(page.getByRole('banner').getByRole('link', { name: /^Carrito, vacío$/ })).toBeVisible()
    expect(errors, 'errores de consola en la portada').toEqual([])
  })

  test('los enlaces internos de cabecera y pie responden 200', async ({ page }) => {
    // Primera compilación de cada ruta en desarrollo: puede tardar varios segundos por página.
    test.setTimeout(300_000)
    await page.goto('/')
    const hrefs = await page
      .locator('header a[href^="/"], footer a[href^="/"]')
      .evaluateAll((anchors) => [...new Set(anchors.map((a) => a.getAttribute('href') ?? ''))].filter((h) => h !== '' && !h.includes('#')))
    expect(hrefs).toEqual(expect.arrayContaining(['/productos', '/como-funciona', '/empresas', '/contacto', '/seguimiento', '/legal/privacidad', '/personalizar']))
    for (const href of hrefs) {
      const res = await page.request.get(href)
      expect(res.status(), `${href} debería responder 200`).toBe(200)
    }
  })

  test('desde el menú se llega al catálogo y el enlace queda marcado como página actual', async ({ page }) => {
    await page.goto('/')
    if (isMobile()) {
      await page.getByRole('button', { name: 'Menú' }).click()
      await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Productos' }).click()
    } else {
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Productos' }).click()
    }
    await expect(page).toHaveURL(/\/productos$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('personalizar')
    if (!isMobile()) {
      await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Productos' })).toHaveAttribute('aria-current', 'page')
    }
  })

  test('el menú móvil se cierra con Escape y devuelve el foco al botón', async ({ page }) => {
    test.skip(!isMobile(), 'solo hay menú desplegable en pantallas estrechas')
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Menú' })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
  })

  test('una ruta inexistente responde 404 con la página de error de la tienda', async ({ page }) => {
    const response = await page.goto('/esta-pagina-no-existe')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Esta página se ha perdido' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()
  })

  test('robots.txt y sitemap.xml existen y el sitemap incluye el catálogo', async ({ page }) => {
    const robots = await page.request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect(await robots.text()).toMatch(/sitemap/i)
    const sitemap = await page.request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    const xml = await sitemap.text()
    expect(xml).toContain('/productos')
    expect(xml).toContain('/productos/camisetas-personalizadas')
  })

  test('el enlace para saltar al contenido apunta al contenido principal', async ({ page }) => {
    await page.goto('/')
    const skip = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(skip).toHaveAttribute('href', '#contenido')
    await expect(page.locator('main#contenido')).toHaveCount(1)
  })
})
