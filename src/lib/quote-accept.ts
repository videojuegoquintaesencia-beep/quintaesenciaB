/**
 * Aceptación de una propuesta de presupuesto por el cliente: crea el pedido (pendiente de pago) a partir de la
 * propuesta guardada —nunca de importes del navegador— y prepara el pago con la misma mecánica que el checkout.
 * Solo servidor.
 */
import 'server-only'
import { z } from 'zod'
import { site } from '@/config/site'
import { consentsSchema, orderPagePath, recordConsents } from './checkout'
import { emptyDesign } from './design'
import { provinceFromPostalCode } from './es-provinces'
import { isPostalCodeDeliverable } from './pricing'
import { isProposalExpired, type Proposal } from './proposal'
import { catalogProduct, type Catalog } from './settings-schema'
import { createPayPalOrder, type PaymentMode } from './paypal'
import {
  addOrderEvent,
  createOrder,
  getOrderById,
  markPaymentFailed,
  setPayPalOrderId,
  updateOrderStatus,
  type Order,
  type OrderItem,
  type PaymentProvider,
} from './orders'
import { getQuote, linkQuoteOrder, type Quote } from './quotes'
import { addressSchema, customerSchema, fieldErrors } from './validators'

/** Cuerpo de POST /api/quotes/[id]/accept (sin el token, que se comprueba antes). */
export const quoteAcceptSchema = z.object({
  customer: customerSchema,
  shipping: addressSchema,
  note: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
  consents: consentsSchema,
})

/** Pedido vinculado al presupuesto (cualquiera que sea su estado), o null si aún no lo hay. */
export async function loadQuoteOrder(quote: Pick<Quote, 'orderId'>): Promise<Order | null> {
  return quote.orderId ? getOrderById(quote.orderId) : null
}

/**
 * Un pedido cancelado deja de contar: la dueña puede entonces retocar la propuesta y el cliente volver a aceptarla.
 * Con cualquier otro pedido la propuesta está aceptada y es inmutable.
 */
export function isLiveQuoteOrder(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'cancelled'
}

/** Líneas del pedido a partir de la propuesta: sin diseño ni archivos, con la descripción y el precio acordados. */
export function proposalOrderItems(proposal: Proposal, catalog: Catalog): OrderItem[] {
  return proposal.lines.map((line) => {
    const product = line.productId === 'otro' ? undefined : catalogProduct(catalog, line.productId)
    return {
      lineId: line.lineId,
      kind: 'quote',
      productId: line.productId,
      productName: product?.name ?? 'Otro producto',
      colorId: '',
      colorName: '',
      colorHex: '#ffffff',
      sizes: line.sizes,
      quantity: line.quantity,
      unitBaseCents: line.unitCents,
      printCents: 0,
      prints: [],
      sizeSurchargeCents: 0,
      grossCents: line.totalCents,
      discountPct: 0,
      discountCents: 0,
      totalCents: line.totalCents,
      design: product ? emptyDesign(product.id, product.colors[0]?.id ?? '') : undefined,
      previews: {},
      printFiles: {},
      description: line.description,
      unitCents: line.unitCents,
    }
  })
}

export type AcceptFailure = {
  ok: false
  status: number
  code: string
  error: string
  fieldErrors?: Record<string, string>
  /** Página del pedido cuando ya está pagado (para llevar al cliente allí). */
  redirect?: string
}
export type AcceptSuccess = { ok: true; orderId: string; paypalOrderId?: string }
export type AcceptResult = AcceptSuccess | AcceptFailure

const fail = (status: number, code: string, error: string, extra: Partial<AcceptFailure> = {}): AcceptFailure => ({
  ok: false,
  status,
  code,
  error,
  ...extra,
})

const PAYPAL_START_ERROR = 'No hemos podido iniciar el pago con PayPal. Inténtalo de nuevo en unos minutos.'

/**
 * Con PayPal, crea el pedido de PayPal del pedido pendiente; con pago demo no hace falta nada.
 * Al retomar un pago (`resume`) se crea un pedido de PayPal NUEVO en vez de reutilizar el anterior: PayPal los caduca
 * a las pocas horas y el anterior pudo quedar rechazado. El de PayPal que queda registrado es siempre el último, y la
 * captura solo acepta ese, así que un pedido de PayPal antiguo nunca puede cobrarse por su cuenta.
 */
async function startPayment(order: Order, mode: PaymentMode, resume = false): Promise<AcceptResult> {
  if (mode !== 'paypal') return { ok: true, orderId: order.id }
  try {
    const paypalOrder = await createPayPalOrder(order, resume ? `${order.id}-${Date.now()}` : order.id)
    await setPayPalOrderId(order.id, paypalOrder.id)
    return { ok: true, orderId: order.id, paypalOrderId: paypalOrder.id }
  } catch (err) {
    console.error('[presupuestos] No se pudo crear el pedido en PayPal:', err instanceof Error ? err.message : err)
    await markPaymentFailed(order.id, 'No se pudo iniciar el pago en PayPal')
    return fail(502, 'paypal_unavailable', PAYPAL_START_ERROR)
  }
}

/**
 * Propuesta ya aceptada: devuelve el mismo pedido (idempotente). Si está pagado, remite a la página del pedido;
 * si cambió el método de pago desde que se creó, no se puede continuar con él.
 */
export async function resumeAcceptedOrder(order: Order, mode: PaymentMode): Promise<AcceptResult> {
  if (order.status !== 'pending_payment') {
    return fail(409, 'already_paid', 'Esta propuesta ya está aceptada y pagada.', { redirect: orderPagePath(order) })
  }
  const provider: PaymentProvider = mode === 'demo' ? 'demo' : 'paypal'
  if (order.payment.provider !== provider) {
    return fail(
      409,
      'provider_changed',
      `El método de pago ha cambiado desde que aceptaste la propuesta. Escríbenos a ${site.contact.email} y lo resolvemos.`,
    )
  }
  return startPayment(order, mode, true)
}

/**
 * Valida los datos del cliente, crea el pedido pendiente de pago a partir de la propuesta y lo vincula al
 * presupuesto. `beforeCreate` permite aplicar el límite de creación justo antes de escribir (como en /api/checkout).
 * Solo debe llamarse cuando el presupuesto no tiene un pedido vivo: su `orderId` actual (null, un pedido cancelado
 * o uno ya eliminado por la limpieza de pedidos sin pagar) es el que se sustituye.
 */
export async function acceptProposal(
  quote: Quote,
  raw: unknown,
  mode: PaymentMode,
  catalog: Catalog,
  opts: { beforeCreate?: () => AcceptFailure | null },
): Promise<AcceptResult> {
  const proposal = quote.proposal
  if (!proposal) return fail(404, 'not_found', 'Propuesta no encontrada.')
  if (isProposalExpired(proposal)) {
    return fail(409, 'expired', 'Esta propuesta ha caducado. Escríbenos y te enviamos una actualizada.')
  }

  const parsed = quoteAcceptSchema.safeParse(raw)
  if (!parsed.success) {
    return fail(422, 'validation', parsed.error.issues[0]?.message ?? 'Datos no válidos', { fieldErrors: fieldErrors(parsed.error) })
  }
  const { customer, note } = parsed.data
  // La provincia sale del código postal, como en el checkout; el CP debe estar en zona de reparto.
  const shipping = {
    ...parsed.data.shipping,
    province: provinceFromPostalCode(parsed.data.shipping.postalCode) ?? parsed.data.shipping.province,
  }
  if (!isPostalCodeDeliverable(shipping.postalCode, catalog.shipping)) {
    const msg = 'No enviamos a ese código postal desde la tienda online.'
    return fail(422, 'zone', msg, { fieldErrors: { 'shipping.postalCode': msg } })
  }

  const blocked = opts.beforeCreate?.()
  if (blocked) return blocked

  const order = await createOrder({
    customer,
    shipping,
    items: proposalOrderItems(proposal, catalog),
    subtotalCents: proposal.subtotalCents,
    shippingCents: proposal.shippingCents,
    totalCents: proposal.totalCents,
    vatCents: proposal.vatCents,
    paymentProvider: mode === 'demo' ? 'demo' : 'paypal',
    customerNote: note || undefined,
    quoteId: quote.id,
  })

  // Siempre la fecha de ESTA aceptación: si un pedido anterior se canceló, la propuesta guardada aún tenía la vieja.
  const accepted: Proposal = { ...proposal, acceptedAt: new Date().toISOString() }
  const linked = await linkQuoteOrder(quote.id, order.id, accepted, quote.orderId)
  if (!linked) {
    // Dos aceptaciones a la vez: gana la primera y se devuelve su pedido. El que sobra se cancela para que no quede
    // como un pedido pendiente de pago cobrable.
    await updateOrderStatus(order.id, 'cancelled', {
      note: 'Aceptación duplicada de la propuesta: el pedido vigente es otro',
      actor: 'system',
    })
    const fresh = await getQuote(quote.id)
    const winner = fresh ? await loadQuoteOrder(fresh) : null
    if (winner && isLiveQuoteOrder(winner)) return resumeAcceptedOrder(winner, mode)
    return fail(409, 'conflict', 'No hemos podido registrar la aceptación. Vuelve a cargar la página e inténtalo de nuevo.')
  }

  await addOrderEvent(order.id, `Pedido creado al aceptar la propuesta del presupuesto ${quote.number}`, 'customer')
  await recordConsents(order.id)
  return startPayment(order, mode)
}
