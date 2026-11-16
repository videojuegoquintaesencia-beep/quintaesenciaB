import { PAYMENT_UNAVAILABLE_MESSAGE, prepareOrder, readJsonBody, recordConsents } from '@/lib/checkout'
import { createOrder, markPaymentFailed, setPayPalOrderId } from '@/lib/orders'
import { createPayPalOrder, paymentMode } from '@/lib/paypal'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const tooMany = (retryAfterSec: number) =>
  Response.json(
    { error: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.', code: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )

/**
 * POST /api/checkout  { lines, customer, shipping, note?, consents }
 * Valida y vuelve a calcular todo en el servidor, crea el pedido pendiente de pago y, si hay PayPal,
 * el pedido de PayPal. → { orderId, paypalOrderId? }
 */
export async function POST(req: Request) {
  const mode = paymentMode()
  if (mode === 'unavailable') return Response.json({ error: PAYMENT_UNAVAILABLE_MESSAGE, code: 'unavailable' }, { status: 503 })

  const ip = clientIp(req)
  // Tope amplio para cualquier petición y otro más estricto para crear pedidos (evita llenar la base de datos).
  const gate = rateLimit(`checkout-any:${ip}`, 200, 10 * 60_000)
  if (!gate.ok) return tooMany(gate.retryAfterSec)

  const body = await readJsonBody(req)
  if (body === undefined) return Response.json({ error: 'Petición no válida.', code: 'validation' }, { status: 400 })

  const prepared = await prepareOrder(body, mode === 'demo' ? 'demo' : 'paypal')
  if (!prepared.ok) {
    const { status, ...payload } = prepared
    return Response.json(payload, { status })
  }

  const create = rateLimit(`checkout-create:${ip}`, 20, 10 * 60_000)
  if (!create.ok) return tooMany(create.retryAfterSec)

  const order = await createOrder(prepared.input)
  await recordConsents(order.id)

  if (mode === 'demo') return Response.json({ orderId: order.id })

  try {
    const paypalOrder = await createPayPalOrder(order)
    await setPayPalOrderId(order.id, paypalOrder.id)
    return Response.json({ orderId: order.id, paypalOrderId: paypalOrder.id })
  } catch (err) {
    console.error('[checkout] No se pudo crear el pedido en PayPal:', err instanceof Error ? err.message : err)
    await markPaymentFailed(order.id, 'No se pudo iniciar el pago en PayPal')
    return Response.json(
      { error: 'No hemos podido iniciar el pago con PayPal. Inténtalo de nuevo en unos minutos.', code: 'paypal_unavailable' },
      { status: 502 },
    )
  }
}
