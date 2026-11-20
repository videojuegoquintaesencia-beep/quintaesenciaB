import { after } from 'next/server'
import { notifyOrderPaid, orderPagePath, readJsonBody } from '@/lib/checkout'
import { isValidId } from '@/lib/ids'
import { addOrderEvent, getOrderById, markOrderPaid, markPaymentFailed } from '@/lib/orders'
import {
  PayPalApiError,
  capturePayPalOrder,
  getPayPalOrder,
  isPayPalConfigured,
  verifyCapturedOrder,
  type CaptureVerdict,
  type PayPalOrderResponse,
} from '@/lib/paypal'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'
import { writeToUs } from '@/lib/contact-text'

export const runtime = 'nodejs'

/** Con el email de contacto efectivo (ajustes del panel); solo se construye cuando hay que devolver un error. */
async function contactHint(): Promise<string> {
  const { contact } = await getSettings()
  return `Si te han cobrado, ${writeToUs(contact.email)} y lo revisamos enseguida.`
}

/**
 * POST /api/paypal/capture  { orderId, paypalOrderId }
 * Captura el pago aprobado por el cliente, comprueba importe/divisa/pedido y solo entonces marca el
 * pedido como pagado. Es idempotente: repetirla no vuelve a enviar emails. → { redirect }
 */
export async function POST(req: Request) {
  if (!isPayPalConfigured()) return Response.json({ error: 'PayPal no está configurado.' }, { status: 503 })
  const limit = rateLimit(`capture:${clientIp(req)}`, 30, 10 * 60_000)
  if (!limit.ok) return Response.json({ error: 'Demasiados intentos.' }, { status: 429 })

  const body = (await readJsonBody(req, 4096)) as { orderId?: unknown; paypalOrderId?: unknown } | undefined
  const { orderId, paypalOrderId } = body ?? {}
  if (!isValidId(orderId) || typeof paypalOrderId !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(paypalOrderId))
    return Response.json({ error: 'Datos no válidos.' }, { status: 400 })

  const order = await getOrderById(orderId)
  if (!order || order.payment.provider !== 'paypal' || order.payment.paypalOrderId !== paypalOrderId)
    return Response.json({ error: 'Pedido no encontrado.' }, { status: 404 })

  // Ya cobrado (reintento del cliente o webhook anterior): no se captura ni se avisa otra vez.
  if (order.status !== 'pending_payment') {
    if (order.payment.status === 'captured') return Response.json({ redirect: orderPagePath(order) })
    return Response.json({ error: 'Este pedido ya no admite pago.' }, { status: 409 })
  }

  let paypalOrder: PayPalOrderResponse
  let verdict: CaptureVerdict
  try {
    paypalOrder = await capturePayPalOrder(paypalOrderId, order.id)
    verdict = verifyCapturedOrder(paypalOrder, { orderId: order.id, totalCents: order.totalCents })
    if (!verdict.ok && verdict.kind === 'missing_custom_id') {
      paypalOrder = await getPayPalOrder(paypalOrderId)
      verdict = verifyCapturedOrder(paypalOrder, { orderId: order.id, totalCents: order.totalCents })
    }
  } catch (err) {
    if (err instanceof PayPalApiError && err.issue === 'INSTRUMENT_DECLINED') {
      await markPaymentFailed(order.id, 'PayPal rechazó el método de pago del cliente')
      return Response.json(
        { error: 'PayPal no ha podido cobrar con ese método de pago. Prueba con otro y no te preocupes: no te hemos cobrado.', code: 'declined' },
        { status: 402 },
      )
    }
    console.error('[paypal] Error al capturar:', err instanceof Error ? err.message : err)
    return Response.json(
      { error: `No hemos podido confirmar el pago con PayPal. ${await contactHint()}`, code: 'capture_error' },
      { status: 502 },
    )
  }

  if (!verdict.ok) {
    if (verdict.kind === 'pending') {
      await addOrderEvent(order.id, 'Pago pendiente de revisión por PayPal', 'paypal')
      return Response.json(
        {
          pending: true,
          redirect: orderPagePath(order),
          error: 'PayPal está revisando tu pago. Te avisaremos por email en cuanto se confirme.',
          code: 'pending',
        },
        { status: 202 },
      )
    }
    console.error(`[paypal] Captura rechazada para ${order.number}: ${verdict.message}`)
    await markPaymentFailed(order.id, `Verificación del pago fallida: ${verdict.message}`)
    return Response.json(
      { error: `No hemos podido verificar el pago. ${await contactHint()}`, code: 'verification_failed' },
      { status: 409 },
    )
  }

  const { order: paid, alreadyPaid } = await markOrderPaid(order.id, { provider: 'paypal', captureId: verdict.captureId })
  if (!alreadyPaid) after(() => notifyOrderPaid(paid))
  return Response.json({ redirect: orderPagePath(paid) })
}
