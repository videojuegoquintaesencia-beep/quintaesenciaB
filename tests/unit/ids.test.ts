import { describe, expect, it } from 'vitest'
import { isValidId, newId } from '@/lib/ids'

describe('newId', () => {
  it('genera 20 caracteres de [a-z0-9] por defecto y respeta la longitud pedida', () => {
    expect(newId()).toMatch(/^[a-z0-9]{20}$/)
    expect(newId(12)).toMatch(/^[a-z0-9]{12}$/)
    expect(newId(40)).toMatch(/^[a-z0-9]{40}$/)
  })

  it('no repite identificadores (aleatoriedad criptográfica)', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId(12)))
    expect(ids.size).toBe(2000)
  })

  it('usa todo el alfabeto a lo largo de muchas muestras', () => {
    const seen = new Set(Array.from({ length: 300 }, () => newId(20)).join(''))
    expect(seen.size).toBe(36)
  })
})

describe('isValidId', () => {
  it('acepta los ids que genera newId con longitudes de 12 a 40', () => {
    expect(isValidId(newId())).toBe(true)
    expect(isValidId(newId(12))).toBe(true)
    expect(isValidId(newId(28))).toBe(true)
    expect(isValidId(newId(40))).toBe(true)
  })

  it('rechaza longitudes fuera de rango, mayúsculas, símbolos y tipos que no son cadena', () => {
    expect(isValidId('abcdefghijk')).toBe(false) // 11
    expect(isValidId('a'.repeat(41))).toBe(false)
    expect(isValidId('ABCDEFGHIJKL')).toBe(false)
    expect(isValidId('abcdefghijk-')).toBe(false)
    expect(isValidId('../etc/passwd')).toBe(false)
    expect(isValidId(123456789012)).toBe(false)
    expect(isValidId(null)).toBe(false)
    expect(isValidId(undefined)).toBe(false)
  })
})
