/** Parte pura de `lib/paypal`: importes, cuerpo del pedido y verificación de capturas (sin red). */
import { describe, expect, it } from 'vitest'
import {
  amountToCents,
  buildPayPalOrderPayload,
  centsToAmount,
  isDemoPaymentAllowed,
  isPayPalConfigured,
  paymentMode,
  paypalBaseUrl,
  verifyCaptureResource,
  verifyCapturedOrder,
  type PayPalCapture,
  type PayPalOrderResponse,
} from '@/lib/paypal'

describe('centsToAmount', () => {
  it('convierte céntimos a texto decimal exacto', () => {
    expect(centsToAmount(1234)).toBe('12.34')
    expect(centsToAmount(5)).toBe('0.05')
    expect(centsToAmount(100)).toBe('1.00')
    expect(centsToAmount(0)).toBe('0.00')
    expect(centsToAmount(1_000_000_00)).toBe('1000000.00')
  })

  it('rechaza negativos, decimales y números no seguros', () => {
    expect(() => centsToAmount(-1)).toThrow(RangeError)
    expect(() => centsToAmount(1.5)).toThrow(RangeError)
    expect(() => centsToAmount(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError)
    expect(() => centsToAmount(Number.NaN)).toThrow(RangeError)
  })
})

describe('amountToCents', () => {
  it.each<[unknown, number | null]>([
    ['12.34', 1234],
    ['12.3', 1230],
    ['12', 1200],
    [' 12.34 ', 1234],
    ['0.5', 50],
    ['0.05', 5],
    ['12.345', null],
    ['12,34', null],
    ['abc', null],
    ['', null],
    ['-1.00', null],
    ['1234567890', null],
    [12.34, null],
    [null, null],
  ])('%j → %j', (value, cents) => {
    expect(amountToCents(value)).toBe(cents)
  })

  it('es la inversa de centsToAmount', () => {
    for (const cents of [0, 1, 99, 100, 1234, 999999]) expect(amountToCents(centsToAmount(cents))).toBe(cents)
  })
})

const order = {
  id: 'abcdefghijklmnopqrst',
  number: 'PU-1001',
  subtotalCents: 3140,
  shippingCents: 495,
  totalCents: 3635,
  items: [
    { productName: 'Camiseta', colorName: 'Blanco', quantity: 1, totalCents: 1140 },
    { productName: 'Taza', colorName: 'Rosa', quantity: 2, totalCents: 2000 },
  ],
} as unknown as Parameters<typeof buildPayPalOrderPayload>[0]

describe('buildPayPalOrderPayload', () => {
  it('construye una sola unidad de compra con desglose cuadrado y un artículo por línea', () => {
    const payload = buildPayPalOrderPayload(order)
    expect(payload.intent).toBe('CAPTURE')
    const unit = payload.purchase_units[0]
    expect(unit.reference_id).toBe('PU-1001')
    expect(unit.invoice_id).toBe('PU-1001')
    expect(unit.custom_id).toBe(order.id)
    expect(unit.description).toBe('Pedido PU-1001 · Pieza Única')
    expect(unit.amount).toEqual({
      currency_code: 'EUR',
      value: '36.35',
      breakdown: { item_total: { currency_code: 'EUR', value: '31.40' }, shipping: { currency_code: 'EUR', value: '4.95' } },
    })
    expect(unit.items).toEqual([
      { name: 'Camiseta · Blanco · 1 ud', quantity: '1', unit_amount: { currency_code: 'EUR', value: '11.40' }, category: 'PHYSICAL_GOODS' },
      { name: 'Taza · Rosa · 2 uds', quantity: '1', unit_amount: { currency_code: 'EUR', value: '20.00' }, category: 'PHYSICAL_GOODS' },
    ])
    // Los precios por unidad son fraccionarios tras descuentos: cada línea va como un artículo de cantidad 1
    const sum = unit.items.reduce((n, it) => n + amountToCents(it.unit_amount.value)!, 0)
    expect(sum).toBe(amountToCents(unit.amount.breakdown.item_total.value))
    expect(payload.payment_source.paypal.experience_context).toMatchObject({ locale: 'es-ES', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' })
  })

  it('se niega a enviar un pedido cuyos importes no cuadran', () => {
    expect(() => buildPayPalOrderPayload({ ...order, subtotalCents: 3141 })).toThrow('Los importes del pedido no cuadran; no se envía a PayPal.')
    expect(() => buildPayPalOrderPayload({ ...order, totalCents: 3636 })).toThrow('Los importes del pedido no cuadran; no se envía a PayPal.')
    expect(() => buildPayPalOrderPayload({ ...order, items: [order.items[0]] })).toThrow(/no cuadran/)
  })

  it('recorta los textos a los 127 caracteres que admite PayPal', () => {
    const long = { ...order, items: [{ ...order.items[0], productName: 'X'.repeat(200), totalCents: 3140 }] }
    expect(buildPayPalOrderPayload(long).purchase_units[0].items[0].name).toHaveLength(127)
  })
})

/* ───────────── Verificación de capturas ───────────── */

const expected = { orderId: order.id, totalCents: 3635 }
const capture = (over: Partial<PayPalCapture> = {}): PayPalCapture => ({
  id: 'CAP-1',
  status: 'COMPLETED',
  amount: { currency_code: 'EUR', value: '36.35' },
  ...over,
})
const response = (over: Partial<PayPalOrderResponse> = {}, unit: Partial<NonNullable<PayPalOrderResponse['purchase_units']>[number]> = {}): PayPalOrderResponse => ({
  id: 'PP-ORDER',
  status: 'COMPLETED',
  purchase_units: [{ custom_id: order.id, payments: { captures: [capture()] }, ...unit }],
  ...over,
})

describe('verifyCapturedOrder', () => {
  it('acepta un pedido completado con una captura del importe exacto en euros y nuestro custom_id', () => {
    expect(verifyCapturedOrder(response(), expected)).toEqual({ ok: true, captureId: 'CAP-1' })
  })

  it('admite el custom_id solo en la captura y suma varias capturas completadas', () => {
    const pp = response({}, { custom_id: undefined, payments: { captures: [capture({ id: 'A', amount: { currency_code: 'EUR', value: '30.00' }, custom_id: order.id }), capture({ id: 'B', amount: { currency_code: 'EUR', value: '6.35' } })] } })
    expect(verifyCapturedOrder(pp, expected)).toEqual({ ok: true, captureId: 'A' })
  })

  it('rechaza una respuesta sin compra', () => {
    expect(verifyCapturedOrder({ id: 'x', status: 'COMPLETED' }, expected)).toMatchObject({ ok: false, kind: 'mismatch' })
  })

  it('rechaza un pago que pertenece a otro pedido, aunque el importe coincida', () => {
    expect(verifyCapturedOrder(response({}, { custom_id: 'otro-pedido' }), expected)).toEqual({ ok: false, kind: 'mismatch', message: 'El pago de PayPal pertenece a otro pedido.' })
    expect(verifyCapturedOrder(response({}, { payments: { captures: [capture({ custom_id: 'otro' })] } }), expected)).toMatchObject({ kind: 'mismatch' })
  })

  it('un pago pendiente de revisión se señala como "pending" (hay que esperar al webhook)', () => {
    const pp = response({ status: 'COMPLETED' }, { payments: { captures: [capture({ status: 'PENDING' })] } })
    expect(verifyCapturedOrder(pp, expected)).toEqual({ ok: false, kind: 'pending', message: 'PayPal tiene el pago pendiente de revisión.' })
  })

  it('un pedido no completado o una captura rechazada no se aceptan', () => {
    expect(verifyCapturedOrder(response({ status: 'APPROVED' }), expected)).toMatchObject({ ok: false, kind: 'not_completed', message: 'PayPal no completó el cobro (estado APPROVED).' })
    expect(verifyCapturedOrder(response({}, { payments: { captures: [capture({ status: 'DECLINED' })] } }), expected)).toMatchObject({ kind: 'not_completed' })
  })

  it('sin ningún custom_id pide releer el pedido', () => {
    expect(verifyCapturedOrder(response({}, { custom_id: undefined }), expected)).toMatchObject({ ok: false, kind: 'missing_custom_id' })
  })

  it('rechaza divisas e importes que no coinciden con el pedido', () => {
    expect(verifyCapturedOrder(response({}, { payments: { captures: [capture({ amount: { currency_code: 'USD', value: '36.35' } })] } }), expected)).toMatchObject({
      kind: 'mismatch',
      message: 'La divisa o el importe cobrado no son válidos.',
    })
    expect(verifyCapturedOrder(response({}, { payments: { captures: [capture({ amount: { currency_code: 'EUR', value: '36.34' } })] } }), expected)).toEqual({
      ok: false,
      kind: 'mismatch',
      message: 'El importe cobrado (36.34 EUR) no coincide con el del pedido (36.35 EUR).',
    })
    expect(verifyCapturedOrder(response({}, { payments: { captures: [capture({ amount: undefined })] } }), expected)).toMatchObject({ kind: 'mismatch' })
  })
})

describe('verifyCaptureResource (webhooks)', () => {
  it('acepta una captura completada del importe exacto para nuestro pedido', () => {
    expect(verifyCaptureResource(capture({ custom_id: order.id }), expected)).toEqual({ ok: true, captureId: 'CAP-1' })
  })

  it('distingue otro pedido, pendiente, no completada y descuadre', () => {
    expect(verifyCaptureResource(capture({ custom_id: 'otro' }), expected)).toMatchObject({ kind: 'mismatch' })
    expect(verifyCaptureResource(capture({ custom_id: order.id, status: 'PENDING' }), expected)).toMatchObject({ kind: 'pending' })
    expect(verifyCaptureResource(capture({ custom_id: order.id, status: 'DECLINED' }), expected)).toMatchObject({ kind: 'not_completed', message: 'La captura de PayPal está en estado DECLINED.' })
    expect(verifyCaptureResource(capture({ custom_id: order.id, amount: { currency_code: 'EUR', value: '1.00' } }), expected)).toMatchObject({ kind: 'mismatch' })
  })
})

/* ───────────── Configuración ───────────── */

describe('modo de pago según el entorno', () => {
  const configured = { NEXT_PUBLIC_PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'secreto' }

  it('con las dos claves de PayPal se paga con PayPal y nunca en demostración', () => {
    expect(isPayPalConfigured(configured)).toBe(true)
    expect(isDemoPaymentAllowed({ ...configured, NODE_ENV: 'development' })).toBe(false)
    expect(paymentMode({ ...configured, NODE_ENV: 'production' })).toBe('paypal')
  })

  it('claves vacías o solo espacios no cuentan como configuradas', () => {
    expect(isPayPalConfigured({ NEXT_PUBLIC_PAYPAL_CLIENT_ID: '  ', PAYPAL_CLIENT_SECRET: 'x' })).toBe(false)
    expect(isPayPalConfigured({ NEXT_PUBLIC_PAYPAL_CLIENT_ID: 'x' })).toBe(false)
  })

  it('sin PayPal: demostración en desarrollo; en producción solo con ALLOW_DEMO_PAYMENTS=true', () => {
    expect(paymentMode({ NODE_ENV: 'development' })).toBe('demo')
    expect(paymentMode({ NODE_ENV: 'test' })).toBe('demo')
    expect(paymentMode({ NODE_ENV: 'production' })).toBe('unavailable')
    expect(paymentMode({ NODE_ENV: 'production', ALLOW_DEMO_PAYMENTS: 'true' })).toBe('demo')
    expect(paymentMode({ NODE_ENV: 'production', ALLOW_DEMO_PAYMENTS: 'TRUE' })).toBe('unavailable')
  })

  it('paypalBaseUrl distingue sandbox y live, y solo fuera de producción admite un simulador local', () => {
    expect(paypalBaseUrl({ PAYPAL_ENV: 'sandbox' })).toBe('https://api-m.sandbox.paypal.com')
    expect(paypalBaseUrl({})).toBe('https://api-m.sandbox.paypal.com')
    expect(paypalBaseUrl({ PAYPAL_ENV: 'live' })).toBe('https://api-m.paypal.com')
    expect(paypalBaseUrl({ NODE_ENV: 'development', PAYPAL_API_BASE: 'http://localhost:9999/' })).toBe('http://localhost:9999')
    expect(paypalBaseUrl({ NODE_ENV: 'production', PAYPAL_API_BASE: 'http://localhost:9999/', PAYPAL_ENV: 'live' })).toBe('https://api-m.paypal.com')
  })
})
