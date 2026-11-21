/** Utilidades puras del panel: filtros de la lista de pedidos, parámetros de URL y CSV. */
import { describe, expect, it } from 'vitest'
import { buildCsv, csvCell, eurosForCsv } from '@/lib/admin/csv'
import { csvDateTime, formatDeadline, timeAgo } from '@/lib/admin/dates'
import { ORDERS_PAGE_SIZE, parseOrdersFilters } from '@/lib/admin/orders-filters'
import { hrefWith, one, pageWindow, positiveInt } from '@/lib/admin/params'

describe('parseOrdersFilters', () => {
  it('sin parámetros muestra los pedidos en curso, sin búsqueda, sin pendientes y en la página 1', () => {
    expect(parseOrdersFilters({})).toEqual({ status: 'open', q: '', includeUnpaid: false, page: 1 })
    expect(ORDERS_PAGE_SIZE).toBe(25)
  })

  it('acepta los estados reales y los filtros especiales; lo desconocido vuelve a "open"', () => {
    expect(parseOrdersFilters({ estado: 'paid' }).status).toBe('paid')
    expect(parseOrdersFilters({ estado: 'all' }).status).toBe('all')
    expect(parseOrdersFilters({ estado: 'active' }).status).toBe('active')
    expect(parseOrdersFilters({ estado: 'open' }).status).toBe('open')
    expect(parseOrdersFilters({ estado: 'inventado' }).status).toBe('open')
    expect(parseOrdersFilters({ estado: ['shipped', 'paid'] }).status).toBe('shipped')
  })

  it('recorta la búsqueda a 100 caracteres y quita espacios', () => {
    expect(parseOrdersFilters({ q: '  PU-1042  ' }).q).toBe('PU-1042')
    expect(parseOrdersFilters({ q: 'x'.repeat(150) }).q).toHaveLength(100)
  })

  it('solo "1" activa los pendientes de pago y la página debe ser un entero positivo razonable', () => {
    expect(parseOrdersFilters({ pendientes: '1' }).includeUnpaid).toBe(true)
    expect(parseOrdersFilters({ pendientes: 'true' }).includeUnpaid).toBe(false)
    expect(parseOrdersFilters({ pagina: '3' }).page).toBe(3)
    expect(parseOrdersFilters({ pagina: '0' }).page).toBe(1)
    expect(parseOrdersFilters({ pagina: '-2' }).page).toBe(1)
    expect(parseOrdersFilters({ pagina: '2.5' }).page).toBe(1)
    expect(parseOrdersFilters({ pagina: 'x' }).page).toBe(1)
    expect(parseOrdersFilters({ pagina: '100001' }).page).toBe(1)
  })
})

describe('params', () => {
  it('one devuelve el primer valor si el parámetro se repite', () => {
    expect(one(['a', 'b'])).toBe('a')
    expect(one('a')).toBe('a')
    expect(one(undefined)).toBeUndefined()
  })

  it('positiveInt admite un valor por defecto distinto', () => {
    expect(positiveInt(undefined, 7)).toBe(7)
    expect(positiveInt('12', 7)).toBe(12)
  })

  it('hrefWith omite los parámetros vacíos, nulos o falsos', () => {
    expect(hrefWith('/admin/pedidos', { estado: 'paid', q: '', pendientes: undefined, pagina: null, x: false, n: 0 })).toBe('/admin/pedidos?estado=paid&n=0')
    expect(hrefWith('/admin/pedidos', {})).toBe('/admin/pedidos')
    expect(hrefWith('/admin/pedidos', { q: 'ana lópez' })).toBe('/admin/pedidos?q=ana+l%C3%B3pez')
  })

  it('pageWindow enumera todas las páginas hasta 7 y, con más, enseña extremos y entorno con puntos suspensivos', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, null, 20])
    expect(pageWindow(5, 20)).toEqual([1, null, 4, 5, 6, null, 20])
    expect(pageWindow(20, 20)).toEqual([1, null, 17, 18, 19, 20])
    expect(pageWindow(3, 8)).toEqual([1, 2, 3, 4, null, 8])
  })
})

describe('CSV', () => {
  it('csvCell neutraliza fórmulas, respeta literales validados y entrecomilla cuando hace falta', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(12)).toBe('12')
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('+34600112233')).toBe("'+34600112233")
    expect(csvCell('-5')).toBe("'-5")
    expect(csvCell('@usuario')).toBe("'@usuario")
    expect(csvCell('\tx')).toBe("'\tx")
    expect(csvCell({ literal: '+34600112233' })).toBe('+34600112233')
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(csvCell('dos\nlíneas')).toBe('"dos\nlíneas"')
  })

  it('buildCsv empieza por BOM, separa con ";" y termina cada línea con CRLF', () => {
    const csv = buildCsv(['Número', 'Total (€)'], [['PU-1001', '12,90'], ['PU-1002', 5]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('Número;Total (€)\r\nPU-1001;12,90\r\nPU-1002;5\r\n')
  })

  it('eurosForCsv usa coma decimal sin símbolo ni separador de millares', () => {
    expect(eurosForCsv(1290)).toBe('12,90')
    expect(eurosForCsv(5)).toBe('0,05')
    expect(eurosForCsv(123456)).toBe('1234,56')
  })
})

describe('fechas del panel', () => {
  it('csvDateTime da un formato ordenable en hora peninsular', () => {
    expect(csvDateTime('2026-01-15T23:30:00Z')).toBe('2026-01-16 00:30')
    expect(csvDateTime(null)).toBe('')
    expect(csvDateTime('no fecha')).toBe('')
  })

  it('formatDeadline no se deja desplazar de día por la zona horaria', () => {
    expect(formatDeadline('2026-12-20')).toBe('20 dic 2026')
    expect(formatDeadline('20/12/2026')).toBe('—')
    expect(formatDeadline(null)).toBe('—')
  })

  it('timeAgo habla en relativo hasta una semana y luego da la fecha', () => {
    const now = Date.parse('2026-01-20T12:00:00Z')
    expect(timeAgo('2026-01-20T11:59:30Z', now)).toBe('ahora mismo')
    expect(timeAgo('2026-01-20T11:55:00Z', now)).toBe('hace 5 minutos')
    expect(timeAgo('2026-01-19T12:00:00Z', now)).toBe('ayer')
    expect(timeAgo('2026-01-17T12:00:00Z', now)).toBe('hace 3 días')
    expect(timeAgo('2026-01-01T12:00:00Z', now)).toBe('01 ene 2026')
    expect(timeAgo(null, now)).toBe('—')
  })
})
