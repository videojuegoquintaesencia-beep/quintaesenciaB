import { expect, type Page } from '@playwright/test'
import { baseURL } from '../fixtures'

/** Contraseña del panel en desarrollo (sin ADMIN_PASSWORD definido; ver `src/lib/auth.ts`). */
export const ADMIN_PASSWORD = 'admin-demo'

/**
 * Inicia sesión en el panel por la API. La cookie queda en el contexto del navegador (`page.request` comparte el
 * tarro de cookies con la página), así que las navegaciones siguientes ya están autenticadas.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const res = await page.request.post('/api/admin/login', { data: { password: ADMIN_PASSWORD }, headers: { origin: baseURL() } })
  expect(res.ok(), `Acceso al panel: ${res.status()} ${await res.text()}`).toBe(true)
}
