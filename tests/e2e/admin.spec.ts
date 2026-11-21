import { expect, test } from './fixtures'
import { ADMIN_PASSWORD, loginAsAdmin } from './helpers/admin'
import { orderStatusOf } from './helpers/db'
import { createPaidOrder } from './helpers/orders'

test.describe('acceso al panel', () => {
  test('sin sesión, el panel redirige al login y la API responde 401', async ({ page, request }) => {
    await page.goto('/admin/pedidos')
    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Panel de gestión' })).toBeVisible()
    const api = await request.get('/api/admin/orders/export')
    expect(api.status()).toBe(401)
  })

  test('una contraseña incorrecta avisa y la correcta entra en el resumen', async ({ page }) => {
    await page.goto('/admin/login')
    const password = page.getByLabel('Contraseña del panel')
    await password.fill('no-es-la-contraseña')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Contraseña incorrecta. Revísala e inténtalo de nuevo.' })).toBeVisible()
    await password.fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
    await expect(page.getByText('Cifras clave')).toHaveCount(0) // región con aria-label, sin texto visible
    await expect(page.getByRole('region', { name: 'Cifras clave' })).toBeVisible()
  })
})

test.describe('gestión de pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('la lista muestra el pedido pagado y la búsqueda por número lo encuentra', async ({ page }) => {
    const order = await createPaidOrder(page.request, { name: 'Rubén Gil Santos' })
    await page.goto('/admin/pedidos')
    await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible()
    await expect(page.getByRole('link', { name: order.number }).first()).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar pedidos' }).fill(order.number)
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.getByText(`1 pedido para «${order.number}»`)).toBeVisible()
    // La lista es una tabla en pantallas anchas y tarjetas en estrechas (las dos están en el DOM): se mira la visible
    await expect(page.getByText('Rubén Gil Santos').filter({ visible: true }).first()).toBeVisible()

    await page.getByRole('link', { name: order.number }).first().click()
    await expect(page).toHaveURL(new RegExp(`/admin/pedidos/${order.orderId}$`))
  })

  test('el detalle permite pasar el pedido a producción y lo registra en el historial', async ({ page }) => {
    const order = await createPaidOrder(page.request, { sizes: { S: 1, M: 2 } })
    await page.goto(`/admin/pedidos/${order.orderId}`)
    await expect(page.getByRole('heading', { level: 1, name: `Pedido ${order.number}` })).toBeVisible()
    await expect(page.getByText('Solo aparecen los cambios posibles desde «Pagado».')).toBeVisible()
    // Desde "pagado" no se puede entregar ni enviar directamente
    await expect(page.getByRole('button', { name: 'Marcar como entregado' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Marcar como enviado' })).toHaveCount(0)
    // Los archivos de impresión están disponibles para producción
    await expect(page.getByRole('link', { name: /Descargar PNG de impresión/ })).toBeVisible()
    // El PNG de la línea de pruebas mide 1182 × 296 px para una caja de 20 × 5 cm: 150 ppp reales, sin ppp anotados
    await expect(page.getByText('1182 × 296 px · 150 ppp · sin ppp anotados')).toBeVisible()

    await page.getByRole('button', { name: 'Pasar a producción' }).click()
    const form = page.getByRole('form', { name: 'Confirmar: Pasar a producción' })
    await expect(form).toBeVisible()
    await form.getByLabel(/Nota para el historial/).fill('Diseño revisado')
    await form.getByRole('checkbox', { name: /Avisar al cliente por email/ }).uncheck()
    await form.getByRole('button', { name: 'Confirmar: En producción' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Estado cambiado a «En producción».' })).toBeVisible()
    await expect(page.getByText('Solo aparecen los cambios posibles desde «En producción».')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Marcar como listo para enviar' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Historial' })).toContainText('Diseño revisado')
    expect(await orderStatusOf(order.orderId)).toBe('in_production')
  })

  test('la API rechaza una transición no permitida con 409', async ({ page }) => {
    const order = await createPaidOrder(page.request)
    const res = await page.request.post(`/api/admin/orders/${order.orderId}/status`, { data: { status: 'delivered', notify: false }, headers: { origin: test.info().project.use.baseURL ?? '' } })
    expect(res.status()).toBe(409)
    expect(((await res.json()) as { error: string }).error).toBe('Ese cambio de estado no está permitido')
    expect(await orderStatusOf(order.orderId)).toBe('paid')
  })

  test('la hoja de producción reúne número, artículos, tallas, estampados y etiqueta de envío', async ({ page }) => {
    const order = await createPaidOrder(page.request, { name: 'Sofía Navarro', sizes: { M: 3 } })
    await page.goto(`/admin/pedidos/${order.orderId}/produccion`)
    const sheet = page.getByRole('article', { name: `Hoja de producción del pedido ${order.number}` })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText(order.number)
    await expect(sheet.getByRole('heading', { name: /1\. Camiseta · Blanco/ })).toBeVisible()
    await expect(sheet).toContainText('3 unidades')
    await expect(sheet).toContainText('Frente')
    await expect(sheet).toContainText('20 × 5 cm')
    for (const step of ['Impreso', 'Planchado', 'Revisado', 'Empaquetado']) await expect(sheet.getByRole('checkbox', { name: step })).toBeVisible()
    const label = sheet.getByRole('region', { name: 'Etiqueta de envío' })
    await expect(label).toContainText('Sofía Navarro')
    await expect(label).toContainText('28001 Madrid')
    await expect(page.getByRole('button', { name: /Imprimir/ })).toBeVisible()
  })

  test('la exportación CSV lleva BOM, separador ";" y una fila por pedido', async ({ page }) => {
    const order = await createPaidOrder(page.request, { name: 'Carlos Domínguez' })
    const res = await page.request.get('/api/admin/orders/export?estado=all')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/^text\/csv/)
    expect(res.headers()['content-disposition']).toMatch(/attachment; filename="pedidos-pieza-unica-\d{4}-\d{2}-\d{2}\.csv"/)
    const body = await res.body()
    expect([...body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = body.toString('utf8').slice(1)
    const lines = text.split('\r\n')
    expect(lines[0].split(';')).toEqual(expect.arrayContaining(['Número', 'Estado', 'Cliente', 'Total con IVA (€)', 'Código postal']))
    expect(lines[0].split(';')).toHaveLength(21)
    const row = lines.find((l) => l.startsWith(`${order.number};`))
    expect(row, 'el pedido recién creado está en el CSV').toBeDefined()
    const cells = row!.split(';')
    expect(cells[2]).toBe('Pagado')
    expect(cells[3]).toBe('Carlos Domínguez')
    expect(cells[12]).toBe('16,35')
    expect(cells[14]).toBe('Demostración')
    expect(text.endsWith('\r\n')).toBe(true)
  })
})
