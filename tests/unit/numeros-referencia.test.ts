/**
 * Funciones puras de `lib/orders` y `lib/quotes` (números de pedido y de referencia). El resto de esos módulos
 * toca la base de datos y se prueba en `tests/integration`.
 */
import { describe, expect, it } from 'vitest'
import { ORDER_NUMBER_OFFSET, formatOrderNumber, parseOrderNumber } from '@/lib/orders'
import { parseQuoteNumber } from '@/lib/quotes'

describe('números de pedido', () => {
  it('formatOrderNumber añade el prefijo y el desplazamiento de 1000', () => {
    expect(ORDER_NUMBER_OFFSET).toBe(1000)
    expect(formatOrderNumber(1)).toBe('PU-1001')
    expect(formatOrderNumber(42)).toBe('PU-1042')
    expect(formatOrderNumber(123456)).toBe('PU-124456')
  })

  it.each([
    ['PU-1042', 42],
    ['pu-1042', 42],
    ['pu1042', 42],
    ['PU 1042', 42],
    ['1042', 42],
    ['  PU-1042  ', 42],
    ['PU-1001', 1],
  ])('parseOrderNumber(%j) → %i', (value, seq) => {
    expect(parseOrderNumber(value)).toBe(seq)
  })

  it.each([
    ['PU-1000', 'el primer pedido es el 1001'],
    ['PU-0999', 'un número por debajo del desplazamiento'],
    ['999', 'menos de 4 cifras'],
    ['1234567890', 'más de 9 cifras'],
    ['PU-', 'sin número'],
    ['PR-1042', 'el prefijo de presupuesto'],
    ['abc', 'texto'],
    ['', 'vacío'],
    ['PU-10 42', 'cifras separadas'],
  ])('parseOrderNumber(%j) → null (%s)', (value) => {
    expect(parseOrderNumber(value)).toBeNull()
  })

  it('formatear y analizar son operaciones inversas', () => {
    for (const seq of [1, 7, 999, 65535]) expect(parseOrderNumber(formatOrderNumber(seq))).toBe(seq)
  })
})

describe('números de presupuesto y mensaje', () => {
  it.each([
    ['PR-1004', { seq: 4, kind: 'quote' }],
    ['pr1004', { seq: 4, kind: 'quote' }],
    ['PR 1004', { seq: 4, kind: 'quote' }],
    ['MS-1004', { seq: 4, kind: 'contact' }],
    ['ms-1004', { seq: 4, kind: 'contact' }],
    ['1004', { seq: 4, kind: null }],
    ['  1004 ', { seq: 4, kind: null }],
  ])('parseQuoteNumber(%j) → %j', (value, expected) => {
    expect(parseQuoteNumber(value)).toEqual(expected)
  })

  it.each(['PU-1004', 'PR-1000', 'PR-999', 'PR-', '', 'abc', '12345678901'])('parseQuoteNumber(%j) → null', (value) => {
    expect(parseQuoteNumber(value)).toBeNull()
  })
})
