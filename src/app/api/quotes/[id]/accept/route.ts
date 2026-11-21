import { after } from 'next/server'
import { PAYMENT_UNAVAILABLE_MESSAGE } from '@/lib/checkout'
import { readBodyJson } from '@/lib/http-body'
import { isValidId } from '@/lib/ids'
import { runMaintenanceIfDue } from '@/lib/maintenance'
import { paymentMode } from '@/lib/paypal'
import { acceptProposal, isLiveQuoteOrder, loadQuoteOrder, resumeAcceptedOrder, type AcceptResult } from '@/lib/quote-accept'
import { getQuoteByToken } from '@/lib/quotes'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { getCatalog } from '@/lib/settings'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 64 * 1024
/** Pedidos creados cada 10 minutos entre todas las IP juntas (las propuestas aceptadas son pocas). */
const MAX_ORDERS_PER_WINDOW_ALL_IPS = 100

const tooMany = (retryAfterSec: number) =>
  Response.json(
    { error: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.', code: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )

const notFound = () => Response.json({ error: 'Propuesta no encontrada.', code: 'not_found' }, { status: 404 })

function toResponse(result: AcceptResult): Response {
  if (result.ok) return Response.json({ orderId: result.orderId, ...(result.paypalOrderId ? { paypalOrderId: result.paypalOrderId } : {}) })
  const { status, ...payload } = result
  return Response.json(payload, { status })
}

/**
 * POST /api/quotes/[id]/accept  { token, customer, shipping, note?, consents }
 * El cliente acepta la propuesta de un presupuesto: se valida todo en el servidor, se crea el pedido pendiente de pago
 * con los importes de la propuesta guardada y, si hay PayPal, el pedido de PayPal. → { orderId, paypalOrderId? }
 * Es idempotente: si la propuesta ya tiene un pedido, devuelve ese mismo pedido (basta con enviar el token).
 * Con un token ausente o incorrecto responde 404, igual que la página pública.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const mode = paymentMode()
  if (mode === 'unavailable') return Response.json({ error: PAYMENT_UNAVAILABLE_MESSAGE, code: 'unavailable' }, { status: 503 })

  const ip = clientIp(req)
  const gate = rateLimit(`quote-accept-any:${ip}`, 200, 10 * 60_000)
  if (!gate.ok) return tooMany(gate.retryAfterSec)

  const { id } = await ctx.params
  if (!isValidId(id)) return notFound()

  const body = await readBodyJson(req, MAX_BODY_BYTES)
  if (!body.ok) {
    const error = body.status === 413 ? 'La petición es demasiado grande.' : 'Petición no válida.'
    return Response.json({ error, code: 'validation' }, { status: body.status })
  }
  const raw = body.value
  const token = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { token?: unknown }).token : undefined
  if (typeof token !== 'string' || !/^[a-z0-9]{20,40}$/.test(token)) return notFound()

  const quote = await getQuoteByToken(id, token)
  if (!quote) return notFound()

  // Ya aceptada: mismo pedido, directo al pago (o a la página del pedido si ya está pagado).
  const existing = await loadQuoteOrder(quote)
  if (existing && isLiveQuoteOrder(existing)) return toResponse(await resumeAcceptedOrder(existing, mode))

  const result = await acceptProposal(quote, raw, mode, await getCatalog(), {
    beforeCreate: () => {
      const create = rateLimit(`quote-accept-create:${ip}`, 20, 10 * 60_000)
      if (!create.ok) return { ok: false, status: 429, code: 'rate_limited', error: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.' }
      const all = rateLimit('quote-accept-create:all', MAX_ORDERS_PER_WINDOW_ALL_IPS, 10 * 60_000)
      if (!all.ok) return { ok: false, status: 429, code: 'rate_limited', error: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.' }
      return null
    },
  })
  if (result.ok) after(() => runMaintenanceIfDue())
  return toResponse(result)
}
