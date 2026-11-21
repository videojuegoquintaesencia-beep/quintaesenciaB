import { describe, expect, it } from 'vitest'
import { SPAIN_TIME_ZONE, formatCm, formatDate, formatDateTime, formatEUR, formatNumber, unidades } from '@/lib/format'

/** Intl usa espacios duros (U+00A0) entre cifra y símbolo; se normalizan para que las pruebas no dependan de la versión de ICU. */
const plain = (s: string) => s.replace(/ /g, ' ')

describe('formatEUR', () => {
  it('formatea céntimos como euros con coma decimal y símbolo detrás', () => {
    expect(plain(formatEUR(1290))).toBe('12,90 €')
    expect(plain(formatEUR(5))).toBe('0,05 €')
    expect(plain(formatEUR(0))).toBe('0,00 €')
    expect(plain(formatEUR(1234567))).toBe('12.345,67 €')
  })

  it('en modo compacto quita los decimales solo a los importes redondos', () => {
    expect(plain(formatEUR(6000, { compact: true }))).toBe('60 €')
    expect(plain(formatEUR(1250, { compact: true }))).toBe('12,50 €')
  })

  it('admite importes negativos (descuentos)', () => {
    expect(plain(formatEUR(-285))).toMatch(/^-2,85 €$/)
  })
})

describe('medidas y números', () => {
  it('formatCm usa como mucho un decimal', () => {
    expect(plain(formatCm(12.5))).toBe('12,5 cm')
    expect(plain(formatCm(12))).toBe('12 cm')
    expect(plain(formatCm(6.55))).toBe('6,6 cm')
  })

  it('formatNumber redondea a un decimal y agrupa millares', () => {
    expect(formatNumber(3.14159)).toBe('3,1')
    expect(formatNumber(12345.6)).toBe('12.345,6')
    expect(formatNumber(1200)).toBe('1200')
  })
})

describe('fechas en hora peninsular', () => {
  it('convierte a Europe/Madrid sea cual sea la zona del servidor', () => {
    expect(SPAIN_TIME_ZONE).toBe('Europe/Madrid')
    // 23:30 UTC del 15 de enero son las 00:30 del 16 en Madrid (invierno, UTC+1)
    expect(formatDate('2026-01-15T23:30:00Z')).toBe('16 ene 2026')
    expect(formatDateTime('2026-01-15T23:30:00Z')).toBe('16 ene 2026, 00:30')
    // En verano, UTC+2
    expect(formatDateTime('2026-07-01T10:05:00Z')).toBe('01 jul 2026, 12:05')
  })

  it('acepta objetos Date y devuelve cadena vacía para fechas inválidas', () => {
    expect(formatDate(new Date('2026-03-08T12:00:00Z'))).toBe('08 mar 2026')
    expect(formatDate('no es una fecha')).toBe('')
    expect(formatDateTime('')).toBe('')
  })
})

describe('unidades', () => {
  it('concuerda en singular y plural', () => {
    expect(unidades(1)).toBe('1 unidad')
    expect(unidades(3)).toBe('3 unidades')
    expect(unidades(0)).toBe('0 unidades')
  })
})
