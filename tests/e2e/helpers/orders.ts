import type { APIRequestContext } from '@playwright/test'
import { buildCartLine, checkoutPayload, uniqueEmail } from './cart'
import { orderNumberOf } from './db'

export interface PaidOrder {
  orderId: string
  /** Token secreto del enlace de seguimiento. */
  token: string
  /** Ruta de la página del pedido para el cliente (`/pedido/<id>?t=<token>`). */
  pagePath: string
  number: string
  email: string
  name: string
}

/**
 * Crea un pedido por la API pública y lo paga en modo demostración (el mismo camino que sigue el navegador),
 * de modo que pasa por toda la validación del servidor. Devuelve lo necesario para seguirlo o gestionarlo.
 */
export async function createPaidOrder(
  request: APIRequestContext,
  over: { email?: string; name?: string; postalCode?: string; city?: string; province?: string; sizes?: Record<string, number>; note?: string } = {},
): Promise<PaidOrder> {
  const line = await buildCartLine(request, { sizes: over.sizes })
  const email = over.email ?? uniqueEmail('pedido')
  const name = over.name ?? 'Ana Prueba'
  const created = await request.post('/api/checkout', { data: checkoutPayload(line, { ...over, email, name }) })
  if (!created.ok()) throw new Error(`POST /api/checkout → ${created.status()}: ${await created.text()}`)
  const { orderId } = (await created.json()) as { orderId: string }
  const paid = await request.post('/api/checkout/demo-pay', { data: { orderId } })
  if (!paid.ok()) throw new Error(`POST /api/checkout/demo-pay → ${paid.status()}: ${await paid.text()}`)
  const { redirect } = (await paid.json()) as { redirect: string }
  const token = new URL(redirect, 'http://localhost').searchParams.get('t') ?? ''
  return { orderId, token, pagePath: redirect, number: await orderNumberOf(orderId), email, name }
}
