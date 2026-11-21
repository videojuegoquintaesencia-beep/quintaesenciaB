import { describe, expect, it } from 'vitest'
import {
  CONTACT_STATUSES,
  ORDER_STATUSES,
  ORDER_STATUS_CUSTOMER_TEXT,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  ORDER_STATUS_TRANSITIONS,
  QUOTE_STATUSES,
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_TONE,
  isOrderStatus,
  statusesForKind,
  type OrderStatus,
} from '@/lib/order-status'

describe('estados de pedido', () => {
  it('todos los estados tienen etiqueta, tono y texto para el cliente', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_LABEL[status]).toBeTruthy()
      expect(ORDER_STATUS_TONE[status]).toBeTruthy()
      expect(ORDER_STATUS_CUSTOMER_TEXT[status]).toBeTruthy()
    }
  })

  it('isOrderStatus reconoce solo los estados conocidos', () => {
    expect(isOrderStatus('paid')).toBe(true)
    expect(isOrderStatus('pagado')).toBe(false)
    expect(isOrderStatus(null)).toBe(false)
    expect(isOrderStatus(1)).toBe(false)
  })
})

describe('transiciones permitidas desde el panel', () => {
  it.each<[OrderStatus, OrderStatus[]]>([
    ['pending_payment', ['paid', 'cancelled']],
    ['paid', ['in_production', 'cancelled', 'refunded']],
    ['in_production', ['ready', 'shipped', 'cancelled', 'refunded']],
    ['ready', ['shipped', 'delivered', 'refunded']],
    ['shipped', ['delivered', 'refunded']],
    ['delivered', ['refunded']],
    ['cancelled', []],
    ['refunded', []],
  ])('desde %s se puede pasar a %j', (from, to) => {
    expect(ORDER_STATUS_TRANSITIONS[from]).toEqual(to)
  })

  it('ningún estado permite volver a sí mismo ni apunta a estados desconocidos', () => {
    for (const from of ORDER_STATUSES) {
      expect(ORDER_STATUS_TRANSITIONS[from]).not.toContain(from)
      for (const to of ORDER_STATUS_TRANSITIONS[from]) expect(isOrderStatus(to)).toBe(true)
    }
  })

  it('cancelado y reembolsado son finales: nadie llega a "pendiente de pago" y nadie sale de ellos', () => {
    for (const from of ORDER_STATUSES) expect(ORDER_STATUS_TRANSITIONS[from]).not.toContain('pending_payment')
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toHaveLength(0)
    expect(ORDER_STATUS_TRANSITIONS.refunded).toHaveLength(0)
  })

  it('un pedido sin pagar no puede enviarse ni reembolsarse (todavía no hay dinero)', () => {
    expect(ORDER_STATUS_TRANSITIONS.pending_payment).not.toContain('shipped')
    expect(ORDER_STATUS_TRANSITIONS.pending_payment).not.toContain('refunded')
  })

  it('un pedido pagado no se puede entregar sin pasar antes por producción o enviarlo', () => {
    expect(ORDER_STATUS_TRANSITIONS.paid).not.toContain('delivered')
    expect(ORDER_STATUS_TRANSITIONS.paid).not.toContain('shipped')
  })
})

describe('estados de presupuestos y mensajes', () => {
  it('todos tienen etiqueta y tono', () => {
    for (const status of QUOTE_STATUSES) {
      expect(QUOTE_STATUS_LABEL[status]).toBeTruthy()
      expect(QUOTE_STATUS_TONE[status]).toBeTruthy()
    }
  })

  it('un mensaje de contacto solo puede estar nuevo, contactado o archivado', () => {
    expect(statusesForKind('contact')).toEqual(['new', 'contacted', 'archived'])
    expect(statusesForKind('contact')).toBe(CONTACT_STATUSES)
    expect(statusesForKind('quote')).toBe(QUOTE_STATUSES)
  })
})
