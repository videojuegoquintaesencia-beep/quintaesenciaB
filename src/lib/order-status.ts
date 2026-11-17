export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  in_production: 'En producción',
  ready: 'Listo para enviar',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending_payment: 'warning',
  paid: 'info',
  in_production: 'info',
  ready: 'info',
  shipped: 'success',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'neutral',
}

/** Texto para el cliente (web y email) en cada estado. */
export const ORDER_STATUS_CUSTOMER_TEXT: Record<OrderStatus, string> = {
  pending_payment: 'Estamos esperando la confirmación de tu pago.',
  paid: '¡Pago recibido! Estamos revisando tu diseño y lo preparamos para producción.',
  in_production: 'Tu pedido está en producción: estamos imprimiendo y planchando tu diseño.',
  ready: 'Tu pedido está terminado y lo estamos empaquetando para enviarlo.',
  shipped: 'Tu pedido está en camino.',
  delivered: 'Tu pedido ha sido entregado. ¡Esperamos que te encante!',
  cancelled:
    'Hemos cancelado este pedido. Si ya habías pagado, te devolvemos el importe íntegro por el mismo medio de pago (PayPal) en un máximo de 14 días naturales.',
  refunded: 'Hemos reembolsado el importe de este pedido. PayPal puede tardar unos días en reflejarlo.',
}

/** Transiciones que el panel de administración permite desde cada estado. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['in_production', 'cancelled', 'refunded'],
  in_production: ['ready', 'shipped', 'cancelled', 'refunded'],
  ready: ['shipped', 'delivered', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)
}

export const QUOTE_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'archived'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  quoted: 'Presupuesto enviado',
  won: 'Ganado',
  lost: 'Perdido',
  archived: 'Archivado',
}
/** Estados que tienen sentido en un mensaje de contacto (una consulta no se presupuesta, ni se gana ni se pierde). */
export const CONTACT_STATUSES: readonly QuoteStatus[] = ['new', 'contacted', 'archived']

/** Estados que puede tener cada tipo de solicitud: los presupuestos, todos; los mensajes, solo los de consulta. */
export function statusesForKind(kind: 'quote' | 'contact'): readonly QuoteStatus[] {
  return kind === 'contact' ? CONTACT_STATUSES : QUOTE_STATUSES
}

export const QUOTE_STATUS_TONE: Record<QuoteStatus, StatusTone> = {
  new: 'warning',
  contacted: 'info',
  quoted: 'info',
  won: 'success',
  lost: 'danger',
  archived: 'neutral',
}
