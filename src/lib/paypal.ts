/**
 * PayPal Orders API v2 (REST) con fetch. Solo servidor.
 *
 * Flujo: createPayPalOrder (al pulsar el botón) → el cliente aprueba en PayPal → capturePayPalOrder.
 * Cada pedido de la tienda es UNA sola unidad de compra; cada línea del pedido es un artículo de
 * cantidad 1 con su importe total (los descuentos por volumen y los suplementos hacen que el precio por
 * unidad sea fraccionario, así que no se puede repartir por unidades sin descuadrar céntimos).
 */
import 'server-only'
import { site } from '@/config/site'
import type { Order } from './orders'

type Env = Record<string, string | undefined>

/* ───────────── Configuración ───────────── */

const filled = (v: string | undefined) => (v ?? '').trim().length > 0

/** ¿Están las dos claves de PayPal (cliente público y secreto)? */
export function isPayPalConfigured(env: Env = process.env): boolean {
  return filled(env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) && filled(env.PAYPAL_CLIENT_SECRET)
}

/**
 * El pago simulado solo existe si PayPal NO está configurado y además estamos en desarrollo
 * o el dueño lo ha permitido expresamente con ALLOW_DEMO_PAYMENTS=true.
 */
export function isDemoPaymentAllowed(env: Env = process.env): boolean {
  if (isPayPalConfigured(env)) return false
  return env.NODE_ENV !== 'production' || env.ALLOW_DEMO_PAYMENTS === 'true'
}

export type PaymentMode = 'paypal' | 'demo' | 'unavailable'

export function paymentMode(env: Env = process.env): PaymentMode {
  if (isPayPalConfigured(env)) return 'paypal'
  return isDemoPaymentAllowed(env) ? 'demo' : 'unavailable'
}

export function paypalBaseUrl(env: Env = process.env): string {
  // Solo fuera de producción: permite apuntar a un simulador local de la API de PayPal en las pruebas.
  if (env.NODE_ENV !== 'production' && filled(env.PAYPAL_API_BASE)) return (env.PAYPAL_API_BASE as string).trim().replace(/\/$/, '')
  return env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

/* ───────────── Importes ───────────── */

/** 1234 → "12.34" (exacto, sin pasar por coma flotante). */
export function centsToAmount(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError(`Importe no válido: ${cents}`)
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

/** "12.34" → 1234. Devuelve null si el texto no es un importe con como máximo 2 decimales. */
export function amountToCents(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0)
}

/* ───────────── Tipos de la API (solo lo que usamos) ───────────── */

export interface PayPalAmount {
  currency_code: string
  value: string
}

export interface PayPalCapture {
  id: string
  status: string
  amount?: PayPalAmount
  custom_id?: string
  invoice_id?: string
  supplementary_data?: { related_ids?: { order_id?: string } }
  links?: { rel: string; href: string }[]
}

export interface PayPalOrderResponse {
  id: string
  status: string
  purchase_units?: {
    reference_id?: string
    custom_id?: string
    invoice_id?: string
    amount?: PayPalAmount
    payments?: { captures?: PayPalCapture[] }
  }[]
}

export class PayPalApiError extends Error {
  status: number
  /** Código de la primera incidencia ("INSTRUMENT_DECLINED", "ORDER_ALREADY_CAPTURED"…) si PayPal lo da. */
  issue: string | null
  constructor(message: string, status: number, issue: string | null = null) {
    super(message)
    this.name = 'PayPalApiError'
    this.status = status
    this.issue = issue
  }
}

/* ───────────── Cliente HTTP con token en caché ───────────── */

let tokenCache: { token: string; expiresAt: number } | null = null
let tokenInFlight: Promise<string> | null = null

async function fetchAccessToken(): Promise<string> {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ''
  const secret = process.env.PAYPAL_CLIENT_SECRET ?? ''
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null
  if (!res.ok || !data?.access_token) throw new PayPalApiError('No se pudo autenticar con PayPal', res.status)
  // Renovamos un minuto antes de que caduque.
  const ttlMs = Math.max(30, (data.expires_in ?? 300) - 60) * 1000
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs }
  return data.access_token
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token
  tokenInFlight ??= fetchAccessToken().finally(() => {
    tokenInFlight = null
  })
  return tokenInFlight
}

async function paypalRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> } = {},
  retried = false,
): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${paypalBaseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  })
  if (res.status === 401 && !retried) {
    tokenCache = null
    return paypalRequest<T>(path, init, true)
  }
  const data = (await res.json().catch(() => null)) as
    | (T & { name?: string; message?: string; details?: { issue?: string }[] })
    | null
  if (!res.ok || data === null) {
    const issue = data?.details?.[0]?.issue ?? data?.name ?? null
    throw new PayPalApiError(data?.message ?? `PayPal respondió ${res.status}`, res.status, issue)
  }
  return data
}

/* ───────────── Pedidos ───────────── */

type OrderForPayPal = Pick<Order, 'id' | 'number' | 'items' | 'subtotalCents' | 'shippingCents' | 'totalCents'>

const eur = (cents: number): PayPalAmount => ({ currency_code: 'EUR', value: centsToAmount(cents) })

/** Cuerpo de POST /v2/checkout/orders para un pedido de la tienda. */
export function buildPayPalOrderPayload(order: OrderForPayPal) {
  const itemsTotal = order.items.reduce((n, it) => n + it.totalCents, 0)
  if (itemsTotal !== order.subtotalCents || order.subtotalCents + order.shippingCents !== order.totalCents) {
    throw new Error('Los importes del pedido no cuadran; no se envía a PayPal.')
  }
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.number,
        custom_id: order.id,
        invoice_id: order.number,
        description: `Pedido ${order.number} · ${site.name}`.slice(0, 127),
        amount: {
          ...eur(order.totalCents),
          breakdown: { item_total: eur(order.subtotalCents), shipping: eur(order.shippingCents) },
        },
        items: order.items.map((it) => ({
          name: `${it.productName} · ${it.colorName} · ${it.quantity} ${it.quantity === 1 ? 'ud' : 'uds'}`.slice(0, 127),
          quantity: '1',
          unit_amount: eur(it.totalCents),
          category: 'PHYSICAL_GOODS',
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: site.name.slice(0, 127),
          locale: 'es-ES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
      },
    },
  }
}

export async function createPayPalOrder(order: OrderForPayPal): Promise<PayPalOrderResponse> {
  return paypalRequest<PayPalOrderResponse>('/v2/checkout/orders', {
    method: 'POST',
    body: buildPayPalOrderPayload(order),
    // Si se repite la petición por un fallo de red, PayPal devuelve el mismo pedido.
    headers: { 'PayPal-Request-Id': `create-${order.id}`, Prefer: 'return=representation' },
  })
}

export function getPayPalOrder(paypalOrderId: string): Promise<PayPalOrderResponse> {
  return paypalRequest<PayPalOrderResponse>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
}

export function getPayPalCapture(captureId: string): Promise<PayPalCapture> {
  return paypalRequest<PayPalCapture>(`/v2/payments/captures/${encodeURIComponent(captureId)}`)
}

/**
 * Captura el pago aprobado. La cabecera PayPal-Request-Id (= id del pedido) hace la captura idempotente;
 * si PayPal aun así dice que ya estaba capturada, devolvemos el pedido tal y como está.
 */
export async function capturePayPalOrder(paypalOrderId: string, requestId: string): Promise<PayPalOrderResponse> {
  try {
    return await paypalRequest<PayPalOrderResponse>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: { 'PayPal-Request-Id': `capture-${requestId}`, Prefer: 'return=representation' },
    })
  } catch (err) {
    if (err instanceof PayPalApiError && err.issue === 'ORDER_ALREADY_CAPTURED') return getPayPalOrder(paypalOrderId)
    throw err
  }
}

/* ───────────── Verificación de la captura ───────────── */

export type CaptureVerdict =
  | { ok: true; captureId: string }
  /** PayPal aceptó el pedido pero el dinero aún no está (revisión de PayPal): esperar al webhook. */
  | { ok: false; kind: 'pending'; message: string }
  /** El pedido de PayPal no contiene el id de nuestro pedido: conviene releerlo con GET. */
  | { ok: false; kind: 'missing_custom_id'; message: string }
  | { ok: false; kind: 'not_completed' | 'mismatch'; message: string }

/**
 * Comprueba que lo capturado en PayPal es exactamente lo que debe cobrar la tienda:
 * pedido COMPLETED, captura COMPLETED, importe y divisa idénticos al total y custom_id = id del pedido.
 */
export function verifyCapturedOrder(
  pp: PayPalOrderResponse,
  expected: { orderId: string; totalCents: number },
): CaptureVerdict {
  const unit = pp.purchase_units?.[0]
  if (!unit) return { ok: false, kind: 'mismatch', message: 'La respuesta de PayPal no incluye la compra.' }

  const captures = unit.payments?.captures ?? []
  const completed = captures.filter((c) => c.status === 'COMPLETED')

  const customIds = [unit.custom_id, ...captures.map((c) => c.custom_id)].filter((v): v is string => !!v)
  if (customIds.some((v) => v !== expected.orderId))
    return { ok: false, kind: 'mismatch', message: 'El pago de PayPal pertenece a otro pedido.' }

  if (pp.status !== 'COMPLETED' || completed.length === 0) {
    if (captures.some((c) => c.status === 'PENDING'))
      return { ok: false, kind: 'pending', message: 'PayPal tiene el pago pendiente de revisión.' }
    return { ok: false, kind: 'not_completed', message: `PayPal no completó el cobro (estado ${pp.status}).` }
  }

  if (customIds.length === 0)
    return { ok: false, kind: 'missing_custom_id', message: 'La respuesta de PayPal no identifica el pedido.' }

  let paid = 0
  for (const c of completed) {
    const cents = amountToCents(c.amount?.value)
    if (c.amount?.currency_code !== 'EUR' || cents === null)
      return { ok: false, kind: 'mismatch', message: 'La divisa o el importe cobrado no son válidos.' }
    paid += cents
  }
  if (paid !== expected.totalCents)
    return {
      ok: false,
      kind: 'mismatch',
      message: `El importe cobrado (${centsToAmount(paid)} EUR) no coincide con el del pedido (${centsToAmount(expected.totalCents)} EUR).`,
    }

  return { ok: true, captureId: completed[0].id }
}

/** Misma comprobación para una captura suelta (webhook PAYMENT.CAPTURE.*). */
export function verifyCaptureResource(
  capture: PayPalCapture,
  expected: { orderId: string; totalCents: number },
): CaptureVerdict {
  const cents = amountToCents(capture.amount?.value)
  if (capture.custom_id !== expected.orderId)
    return { ok: false, kind: 'mismatch', message: 'La captura pertenece a otro pedido.' }
  if (capture.status === 'PENDING')
    return { ok: false, kind: 'pending', message: 'PayPal tiene el pago pendiente de revisión.' }
  if (capture.status !== 'COMPLETED')
    return { ok: false, kind: 'not_completed', message: `La captura de PayPal está en estado ${capture.status}.` }
  if (capture.amount?.currency_code !== 'EUR' || cents !== expected.totalCents)
    return { ok: false, kind: 'mismatch', message: 'El importe o la divisa de la captura no coinciden con el pedido.' }
  return { ok: true, captureId: capture.id }
}

/* ───────────── Webhooks ───────────── */

/**
 * Verifica la firma de un webhook con el endpoint oficial de PayPal.
 * Devuelve false ante cualquier duda (cabeceras ausentes, error de red, firma inválida).
 */
export async function verifyWebhookSignature(headers: Headers, event: unknown, webhookId: string): Promise<boolean> {
  const h = (name: string) => headers.get(name)
  const body = {
    auth_algo: h('paypal-auth-algo'),
    cert_url: h('paypal-cert-url'),
    transmission_id: h('paypal-transmission-id'),
    transmission_sig: h('paypal-transmission-sig'),
    transmission_time: h('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: event,
  }
  if (!body.auth_algo || !body.cert_url || !body.transmission_id || !body.transmission_sig || !body.transmission_time)
    return false
  try {
    const res = await paypalRequest<{ verification_status?: string }>('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body,
    })
    return res.verification_status === 'SUCCESS'
  } catch {
    return false
  }
}
