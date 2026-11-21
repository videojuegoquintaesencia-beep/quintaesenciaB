import { expect, test } from './fixtures'
import { uniqueEmail } from './helpers/cart'
import { quotesByEmail } from './helpers/db'

test.describe('solicitud de presupuesto (/empresas)', () => {
  test('se envía con el campo trampa vacío y devuelve una referencia PR-', async ({ page }) => {
    const email = uniqueEmail('empresa')
    await page.goto('/empresas')
    const form = page.getByRole('form', { name: 'Solicitud de presupuesto' })
    await form.getByLabel('Nombre y apellidos').fill('Lorena Prieto')
    await form.getByLabel('Empresa, club o evento').fill('Cervecería Artesana Norte')
    await form.getByLabel('Email').fill(email)
    await form.locator('label', { hasText: 'Camisetas' }).click()
    await expect(form.getByRole('checkbox', { name: 'Camisetas' })).toBeChecked()
    await form.locator('label', { hasText: 'Gorras' }).click()
    await form.getByLabel('Unidades aproximadas').fill('80')
    await form.getByLabel('Cuéntanos qué necesitas').fill('Queremos uniformar al equipo para las fiestas: 60 camisetas y 20 gorras con el logo.')
    await form.getByRole('checkbox', { name: /política de privacidad/ }).check()
    await form.getByRole('button', { name: 'Enviar solicitud' }).click()

    const success = page.getByRole('status')
    await expect(success.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible()
    await expect(success).toContainText(email)
    await expect(success.getByText(/^PR-\d{4,}$/)).toBeVisible()

    const saved = await quotesByEmail(email)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ kind: 'quote', status: 'new', products: ['camiseta', 'gorra'] })
  })

  test('sin los campos obligatorios no se envía y se lleva al primero con error', async ({ page }) => {
    await page.goto('/empresas')
    const form = page.getByRole('form', { name: 'Solicitud de presupuesto' })
    await form.getByRole('button', { name: 'Enviar solicitud' }).click()
    await expect(form.getByRole('alert').filter({ hasText: /Hay \d+ campos que revisar/ })).toBeVisible()
    await expect(form.getByRole('alert').filter({ hasText: 'Dinos tu nombre' })).toBeVisible()
    await expect(form.getByRole('alert').filter({ hasText: 'Elige al menos un producto' })).toBeVisible()
    await expect(form.getByLabel('Nombre y apellidos')).toBeFocused()
  })
})

test.describe('contacto (/contacto)', () => {
  test('un mensaje válido se guarda como consulta y devuelve una referencia MS-', async ({ page }) => {
    const email = uniqueEmail('contacto')
    await page.goto('/contacto')
    const form = page.getByRole('form', { name: 'Mensaje de contacto' })
    await form.getByLabel('Nombre').fill('Lucía Fernández')
    await form.getByLabel('Email').fill(email)
    await form.getByRole('textbox', { name: 'Mensaje' }).fill('¿Se pueden personalizar bolsas de tela? Serían unas 15 para una boda.')
    await form.getByRole('checkbox', { name: /política de privacidad/ }).check()
    await form.getByRole('button', { name: 'Enviar mensaje' }).click()

    const success = page.getByRole('status')
    await expect(success.getByRole('heading', { name: '¡Mensaje enviado!' })).toBeVisible()
    await expect(success.getByText(/^MS-\d{4,}$/)).toBeVisible()
    // Se puede enviar otro mensaje
    await success.getByRole('button', { name: 'Enviar otro mensaje' }).click()
    await expect(form.getByLabel('Nombre')).toHaveValue('')

    const saved = await quotesByEmail(email)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ kind: 'contact', status: 'new' })
    expect(saved[0].message).toContain('bolsas de tela')
  })

  test('el consentimiento es obligatorio y el mensaje necesita al menos 10 caracteres', async ({ page }) => {
    await page.goto('/contacto')
    const form = page.getByRole('form', { name: 'Mensaje de contacto' })
    await form.getByLabel('Nombre').fill('Lucía')
    await form.getByLabel('Email').fill(uniqueEmail('corto'))
    await form.getByRole('textbox', { name: 'Mensaje' }).fill('Hola')
    await form.getByRole('button', { name: 'Enviar mensaje' }).click()
    await expect(form.getByRole('alert').filter({ hasText: 'Cuéntanos en qué podemos ayudarte (mínimo 10 caracteres)' })).toBeVisible()
    await expect(form.getByRole('alert').filter({ hasText: 'Debes aceptar la política de privacidad' })).toBeVisible()
  })

  test('un envío con el campo trampa relleno (un bot) recibe un "ok" falso y no se guarda nada', async ({ page }) => {
    const email = uniqueEmail('bot')
    const res = await page.request.post('/api/contact', {
      data: { name: 'Robot', email, message: 'Mensaje automático muy insistente', consent: true, website: 'http://spam.example' },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { ok: boolean; number: string }
    expect(body.ok).toBe(true)
    expect(body.number).toMatch(/^MS-\d{4}$/)
    expect(await quotesByEmail(email)).toEqual([])
  })

  test('la API devuelve los errores por campo', async ({ page }) => {
    const res = await page.request.post('/api/contact', { data: { name: 'L', email: 'x', message: 'corto', consent: false } })
    expect(res.status()).toBe(400)
    const body = (await res.json()) as { ok: boolean; errors: Record<string, string> }
    expect(body.ok).toBe(false)
    expect(body.errors).toMatchObject({ name: 'Dinos tu nombre', email: 'Introduce un email válido', consent: 'Debes aceptar la política de privacidad' })
  })
})
