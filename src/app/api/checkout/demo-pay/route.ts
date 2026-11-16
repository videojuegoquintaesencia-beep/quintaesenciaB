import { after } from 'next/server'
import { notifyOrderPaid, orderPagePath, readJsonBody } from '@/lib/checkout'
import { isValidId } from '@/lib/ids'
import { getOrderById, markOrderPaid } from '@/lib/orders'
import { isDemoPaymentAllowed } from '@/lib/paypal'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * POST /api/checkout/demo-pay  { orderId }
 * Pago simulado SOLO para desarrollo/demostración: imposible si PayPal está configurado o si el
 * modo demostración no está permitido. Solo acepta pedidos creados con el proveedor "demo".
 */
export async function POST(req: Request) {
  if (!isDemoPaymentAllowed()) {
    return Response.json({ error: 'El pago de demostración no está disponible.', code: 'unavailable' }, { status: 503 })
  }
  const limit = rateLimit(`demo-pay:${clientIp(req)}`, 30, 10 * 60_000)
  if (!limit.ok) return Response.json({ error: 'Demasiados intentos.' }, { status: 429 })

  const body = (await readJsonBody(req, 4096)) as { orderId?: unknown } | undefined
  const orderId = body?.orderId
  if (!isValidId(orderId)) return Response.json({ error: 'Pedido no válido.' }, { status: 400 })

  const order = await getOrderById(orderId)
  if (!order || order.payment.provider !== 'demo') return Response.json({ error: 'Pedido no encontrado.' }, { status: 404 })
  if (order.status !== 'pending_payment' && order.payment.status !== 'captured')
    return Response.json({ error: 'Este pedido ya no admite pago.' }, { status: 409 })

  const { order: paid, alreadyPaid } = await markOrderPaid(order.id, { provider: 'demo' })
  if (!alreadyPaid) after(() => notifyOrderPaid(paid))
  return Response.json({ redirect: orderPagePath(paid) })
}
