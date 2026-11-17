import { after } from 'next/server'
import { PAYMENT_UNAVAILABLE_MESSAGE, prepareOrder, recordConsents } from '@/lib/checkout'
import { readBodyJson } from '@/lib/http-body'
import { runMaintenanceIfDue } from '@/lib/maintenance'
import { createOrder, markPaymentFailed, setPayPalOrderId } from '@/lib/orders'
import { createPayPalOrder, paymentMode } from '@/lib/paypal'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** Tope del cuerpo (20 líneas con diseños de hasta 80 capas caben de sobra). */
const MAX_BODY_BYTES = 512 * 1024
/** Pedidos creados cada 10 minutos entre todas las IP juntas (muy por encima de cualquier pico real de la tienda). */
const MAX_ORDERS_PER_WINDOW_ALL_IPS = 300

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

  const body = await readBodyJson(req, MAX_BODY_BYTES)
  if (!body.ok) {
    const error = body.status === 413 ? 'La petición es demasiado grande.' : 'Petición no válida.'
    return Response.json({ error, code: 'validation' }, { status: body.status })
  }

  const prepared = await prepareOrder(body.value, mode === 'demo' ? 'demo' : 'paypal')
  if (!prepared.ok) {
    const { status, ...payload } = prepared
    return Response.json(payload, { status })
  }

  const create = rateLimit(`checkout-create:${ip}`, 20, 10 * 60_000)
  if (!create.ok) return tooMany(create.retryAfterSec)
  // Tope global (todas las IP) de pedidos creados: red de seguridad por si TRUSTED_PROXY_HOPS estuviera mal definido
  // y alguien rotase de "IP" para llenar la base de datos de pedidos sin pagar.
  const createAll = rateLimit('checkout-create:all', MAX_ORDERS_PER_WINDOW_ALL_IPS, 10 * 60_000)
  if (!createAll.ok) return tooMany(createAll.retryAfterSec)

  const order = await createOrder(prepared.input)
  await recordConsents(order.id)
  // Limpieza periódica (como mucho una vez por hora): pedidos que nunca se pagaron y archivos huérfanos.
  after(() => runMaintenanceIfDue())

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
