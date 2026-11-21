import { describe, expect, it } from 'vitest'
import { addressZoneIssue, deliverableProvinces, provinceFromPostalCode } from '@/lib/es-provinces'
import { DEFAULT_CATALOG } from '@/lib/settings-schema'

// Reglas de envío en código (35/38/51/52 excluidos): las provincias entregables y los mensajes salen de ellas.
const RULES = DEFAULT_CATALOG.shipping
const DELIVERABLE_PROVINCES = deliverableProvinces(RULES.excludedPostalPrefixes)

describe('provinceFromPostalCode', () => {
  it('devuelve la provincia de un código postal completo o de su prefijo', () => {
    expect(provinceFromPostalCode('28001')).toBe('Madrid')
    expect(provinceFromPostalCode('28')).toBe('Madrid')
    expect(provinceFromPostalCode('07')).toBe('Illes Balears')
    expect(provinceFromPostalCode('15705')).toBe('A Coruña')
    expect(provinceFromPostalCode(' 28 013 ')).toBe('Madrid')
  })

  it('las zonas sin envío siguen teniendo provincia (para mostrar mensajes claros)', () => {
    expect(provinceFromPostalCode('35001')).toBe('Las Palmas')
    expect(provinceFromPostalCode('51001')).toBe('Ceuta')
  })

  it('devuelve null con menos de dos dígitos, prefijos inexistentes o códigos de 5 cifras inválidos', () => {
    expect(provinceFromPostalCode('2')).toBeNull()
    expect(provinceFromPostalCode('')).toBeNull()
    expect(provinceFromPostalCode('53')).toBeNull()
    expect(provinceFromPostalCode('00')).toBeNull()
    expect(provinceFromPostalCode('99999')).toBeNull()
    expect(provinceFromPostalCode('28abc')).toBeNull()
    expect(provinceFromPostalCode('ab001')).toBeNull()
  })
})

describe('deliverableProvinces', () => {
  it('sin prefijos excluidos incluye Canarias, Ceuta y Melilla (52 provincias)', () => {
    const all = deliverableProvinces([])
    expect(all).toHaveLength(52)
    expect(all).toContain('Las Palmas')
    expect(all).toContain('Melilla')
  })

  it('son las 52 provincias menos Las Palmas, Santa Cruz de Tenerife, Ceuta y Melilla', () => {
    expect(DELIVERABLE_PROVINCES).toHaveLength(48)
    for (const excluded of ['Las Palmas', 'Santa Cruz de Tenerife', 'Ceuta', 'Melilla']) expect(DELIVERABLE_PROVINCES).not.toContain(excluded)
    expect(DELIVERABLE_PROVINCES).toContain('Illes Balears')
    expect(DELIVERABLE_PROVINCES).toContain('Madrid')
  })

  it('están ordenadas alfabéticamente en español (sin que las tildes alteren el orden)', () => {
    const sorted = [...DELIVERABLE_PROVINCES].sort((a, b) => a.localeCompare(b, 'es'))
    expect(DELIVERABLE_PROVINCES).toEqual(sorted)
    expect(DELIVERABLE_PROVINCES[0]).toBe('A Coruña')
    expect(DELIVERABLE_PROVINCES.at(-1)).toBe('Zaragoza')
  })
})

describe('addressZoneIssue', () => {
  const ok = (postalCode: string, province: string, city = 'Ciudad') => addressZoneIssue({ postalCode, province, city }, RULES)

  it('acepta la provincia que corresponde al código postal, en castellano, cooficial o con alias', () => {
    expect(ok('28001', 'Madrid')).toBeNull()
    expect(ok('28001', 'Comunidad de Madrid')).toBeNull()
    expect(ok('07001', 'Baleares')).toBeNull()
    expect(ok('07001', 'Illes Balears')).toBeNull()
    expect(ok('01001', 'Álava')).toBeNull()
    expect(ok('01001', 'Araba/Álava')).toBeNull()
    expect(ok('46001', 'València')).toBeNull()
    expect(ok('48001', 'Vizcaya')).toBeNull()
    expect(ok('17001', 'GERONA')).toBeNull()
  })

  it('señala provincias que no coinciden o no existen', () => {
    expect(ok('28001', 'Barcelona')).toEqual({ field: 'province', message: 'La provincia no coincide con el código postal.' })
    expect(ok('28001', 'Narnia')).toEqual({ field: 'province', message: 'Elige una provincia de la lista.' })
    expect(ok('28001', '')).toEqual({ field: 'province', message: 'Elige una provincia de la lista.' })
  })

  it('detecta las zonas sin envío por el nombre de la provincia o de la localidad, aunque el código postal sea peninsular', () => {
    expect(ok('28001', 'Las Palmas')?.field).toBe('province')
    expect(ok('28001', 'Canarias')?.field).toBe('province')
    expect(ok('28001', 'Melilla')?.message).toMatch(/Aún no enviamos a Canarias, Ceuta y Melilla/)
    expect(ok('28001', 'Madrid', 'Las Palmas de Gran Canaria')?.field).toBe('city')
    expect(ok('28001', 'Madrid', 'Ceuta')?.field).toBe('city')
    expect(ok('28001', 'Madrid', 'Puerto de la Cruz (Tenerife)')?.field).toBe('city')
  })

  it('"Canarias" en la provincia se reconoce para los dos prefijos canarios', () => {
    // Se rechaza antes por ser zona sin envío, no por "no coincidir"
    expect(ok('35001', 'Canarias')?.message).toMatch(/Aún no enviamos/)
  })

  it('compara sin tildes, mayúsculas ni signos de puntuación', () => {
    expect(ok('15001', 'a coruna')).toBeNull()
    expect(ok('15001', 'A CORUÑA (LA CORUÑA)')).toBeNull()
    expect(ok('28001', 'Madrid', 'Alcalá de Henares')).toBeNull()
  })
})
