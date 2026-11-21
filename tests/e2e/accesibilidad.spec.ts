import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { axeAvailable, describeViolations, seriousViolations } from './helpers/axe'
import { buildCartLine, seedCart } from './helpers/cart'

/**
 * Comprobación básica con axe-core (WCAG 2.x A y AA): ninguna violación grave o crítica en las páginas clave.
 * axe-core no es dependencia del proyecto; si no está instalado, estas pruebas se omiten y lo dicen.
 */
test.describe('accesibilidad básica (axe)', () => {
  test.skip(!axeAvailable, 'axe-core no está en node_modules')

  async function expectNoSeriousViolations(page: Page) {
    const violations = await seriousViolations(page)
    expect(violations, `Violaciones graves o críticas:\n${describeViolations(violations)}`).toEqual([])
  }

  test('portada', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test('ficha de producto', async ({ page }) => {
    await page.goto('/productos/camisetas-personalizadas')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  async function openEditorWithText(page: Page) {
    await page.goto('/personalizar/camiseta')
    await page.getByRole('tab', { name: 'Texto' }).click()
    await page.getByRole('button', { name: 'Añadir texto' }).click()
    await expect(page.getByLabel('Contenido')).toHaveValue('Tu texto')
  }

  /**
   * DEFECTO conocido (src/components/editor/panels/TextPanel.tsx, grupo "Contorno"): cuando el grosor es 0, el bloque
   * de colores del contorno se marca con aria-hidden="true" pero sus botones de color siguen siendo enfocables con el
   * teclado (axe: `aria-hidden-focus`, grave). Habría que quitarlo del orden de tabulación (p. ej. `inert` o
   * deshabilitar los botones) en lugar de ocultarlo solo a los lectores de pantalla.
   */
  const KNOWN_EDITOR_GAPS = [{ id: 'aria-hidden-focus', node: '.opacity-40' }]

  test.fixme('editor con un texto añadido (sin excepciones)', async ({ page }) => {
    test.setTimeout(180_000)
    await openEditorWithText(page)
    await expectNoSeriousViolations(page)
  })

  test('editor con un texto añadido (salvo el defecto conocido del contorno)', async ({ page }) => {
    test.setTimeout(180_000)
    await openEditorWithText(page)
    const violations = (await seriousViolations(page)).filter(
      (v) => !KNOWN_EDITOR_GAPS.some((gap) => gap.id === v.id && v.nodes.every((n) => n === gap.node)),
    )
    expect(violations, `Violaciones graves o críticas:\n${describeViolations(violations)}`).toEqual([])
  })

  test('carrito con una línea', async ({ page }) => {
    await seedCart(page, [await buildCartLine(page.request)])
    await expect(page.getByRole('heading', { level: 2, name: 'Camiseta' })).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test('checkout con una línea', async ({ page }) => {
    await seedCart(page, [await buildCartLine(page.request)], '/checkout')
    await expect(page.getByRole('button', { name: /Pedido con obligación de pago/ })).toBeVisible()
    await expectNoSeriousViolations(page)
  })
})
