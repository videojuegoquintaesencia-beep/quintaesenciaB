import { after } from 'next/server'
import { findOrderIdByCaptureId, notifyOrderPaid } from '@/lib/checkout'
import {
  addOrderEvent,
  getOrderById,
  markOrderPaid,
  markPaymentFailed,
  updateOrderStatus,
  type Order,
} from '@/lib/orders'
import {
  getPayPalCapture,
  isPayPalConfigured,
  verifyCaptureResource,
  verifyWebhookSignature,
  type PayPalCapture,
} from '@/lib/paypal'

export const runtime = 'nodejs'

interface WebhookEvent {
  id?: string
  event_type?: string
  resource?: PayPalCapture & { links?: { rel: string; href: string }[] }
}

const ok = (note: string) => Response.json({ ok: true, note })

/** Id de captura al que se refiere el recurso (en un reembolso, el enlace "up" apunta a la captura). */
function relatedCaptureId(event: WebhookEvent): string | null {
  const r = event.resource
  if (!r) return null
  if (event.event_type?.startsWith('PAYMENT.CAPTURE.REFUNDED')) {
    const up = r.links?.find((l) => l.rel === 'up')?.href
    return up?.split('/captures/')[1]?.split(/[/?]/)[0] ?? null
  }
  return r.id ?? null
}

async function orderForCapture(capture: PayPalCapture): Promise<Order | null> {
  if (capture.custom_id) return getOrderById(capture.custom_id)
  const id = await findOrderIdByCaptureId(capture.id)
  return id ? getOrderById(id) : null
}

/**
 * POST /api/paypal/webhook — red de seguridad para clientes que cierran la pestaña tras aprobar el pago.
 *  - Con PAYPAL_WEBHOOK_ID se verifica la firma con la API de PayPal (si no es verificable → 400).
 *  - Sin él, nunca se confía en el cuerpo: se vuelve a pedir la captura a PayPal y se usa esa respuesta.
 */
export async function POST(req: Request) {
  if (!isPayPalConfigured()) return Response.json({ error: 'PayPal no está configurado.' }, { status: 503 })

  let event: WebhookEvent
  try {
    event = JSON.parse(await req.text()) as WebhookEvent
  } catch {
    return Response.json({ error: 'Petición no válida.' }, { status: 400 })
  }
  if (typeof event?.event_type !== 'string') return Response.json({ error: 'Petición no válida.' }, { status: 400 })

  const webhookId = (process.env.PAYPAL_WEBHOOK_ID ?? '').trim()
  const signed = webhookId !== ''
  if (signed && !(await verifyWebhookSignature(req.headers, event, webhookId))) {
    return Response.json({ error: 'Firma no verificable.' }, { status: 400 })
  }

  const type = event.event_type
  const handled = [
    'PAYMENT.CAPTURE.COMPLETED',
    'PAYMENT.CAPTURE.DENIED',
    'PAYMENT.CAPTURE.DECLINED',
    'PAYMENT.CAPTURE.REFUNDED',
  ]
  if (!handled.includes(type)) return ok('ignored')

  const captureId = relatedCaptureId(event)
  if (!captureId) return Response.json({ error: 'Falta la captura.' }, { status: 400 })

  // Con firma válida el recurso del evento es fiable; si no, o si es un reembolso, se relee de PayPal.
  let capture: PayPalCapture
  try {
    capture = signed && type !== 'PAYMENT.CAPTURE.REFUNDED' && event.resource ? event.resource : await getPayPalCapture(captureId)
  } catch (err) {
    console.error('[webhook] No se pudo leer la captura:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'No se pudo comprobar la captura.' }, { status: 502 }) // PayPal reintentará
  }

  const order = await orderForCapture(capture)
  if (!order) return ok('order-not-found')

  if (type === 'PAYMENT.CAPTURE.COMPLETED') {
    const verdict = verifyCaptureResource(capture, { orderId: order.id, totalCents: order.totalCents })
    if (!verdict.ok) {
      console.error(`[webhook] Captura no válida para ${order.number}: ${verdict.message}`)
      if (verdict.kind === 'mismatch') await markPaymentFailed(order.id, `Verificación del webhook fallida: ${verdict.message}`)
      return ok('rejected')
    }
    const { order: paid, alreadyPaid } = await markOrderPaid(order.id, { provider: 'paypal', captureId: verdict.captureId })
    if (!alreadyPaid) after(() => notifyOrderPaid(paid))
    return ok(alreadyPaid ? 'already-paid' : 'paid')
  }

  if (type === 'PAYMENT.CAPTURE.DENIED' || type === 'PAYMENT.CAPTURE.DECLINED') {
    if (order.status === 'pending_payment') await markPaymentFailed(order.id, 'PayPal denegó el cobro')
    return ok('failed')
  }

  // Reembolso: solo se marca el pedido como reembolsado si PayPal confirma que es total.
  if (capture.status === 'REFUNDED') {
    const res = await updateOrderStatus(order.id, 'refunded', {
      force: true,
      actor: 'paypal',
      note: 'Reembolso total realizado en PayPal',
    })
    return ok(res.ok ? 'refunded' : 'already-refunded')
  }
  await addOrderEvent(order.id, 'Reembolso parcial realizado en PayPal', 'paypal')
  return ok('partial-refund')
}
