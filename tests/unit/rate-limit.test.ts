import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { byteBudget, clientIp, normalizeIp, rateLimit, trustedProxyHops } from '@/lib/rate-limit'

/** Cada prueba usa claves propias: los contadores viven en memoria del módulo y no se comparten entre casos. */
let n = 0
const key = () => `prueba-${process.pid}-${++n}`

const request = (headers: Record<string, string> = {}) => new Request('http://pruebas.local/', { headers })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('rateLimit', () => {
  it('permite `limit` peticiones en la ventana y bloquea la siguiente', () => {
    const k = key()
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 1000)).toEqual({ ok: true, retryAfterSec: 0 })
    expect(rateLimit(k, 3, 1000)).toEqual({ ok: false, retryAfterSec: 1 })
  })

  it('al caducar la ventana vuelve a permitir', () => {
    const k = key()
    for (let i = 0; i < 2; i++) rateLimit(k, 2, 1000)
    expect(rateLimit(k, 2, 1000).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit(k, 2, 1000).ok).toBe(true)
  })

  it('la ventana es deslizante: retryAfterSec cuenta desde la petición más antigua que ocupa cupo', () => {
    const k = key()
    rateLimit(k, 3, 60_000)
    rateLimit(k, 3, 60_000)
    rateLimit(k, 3, 60_000)
    vi.advanceTimersByTime(10_000)
    expect(rateLimit(k, 3, 60_000)).toEqual({ ok: false, retryAfterSec: 50 })
    // Un intento bloqueado no alarga el bloqueo
    vi.advanceTimersByTime(50_001)
    expect(rateLimit(k, 3, 60_000).ok).toBe(true)
  })

  it('cada clave lleva su propio contador', () => {
    const a = key()
    const b = key()
    rateLimit(a, 1, 1000)
    expect(rateLimit(a, 1, 1000).ok).toBe(false)
    expect(rateLimit(b, 1, 1000).ok).toBe(true)
  })

  it('las claves se recortan a 200 caracteres (acota la memoria por clave)', () => {
    const base = key().padEnd(200, 'x')
    rateLimit(`${base}-uno`, 1, 1000)
    expect(rateLimit(`${base}-dos`, 1, 1000).ok).toBe(false)
  })
})

describe('byteBudget', () => {
  it('descuenta bytes solo si caben y bloquea cuando se superaría el presupuesto', () => {
    const k = key()
    expect(byteBudget(k, 600, 1000, 60_000)).toEqual({ ok: true, retryAfterSec: 0 })
    expect(byteBudget(k, 500, 1000, 60_000)).toEqual({ ok: false, retryAfterSec: 60 })
    // El intento rechazado no ha consumido nada: 400 bytes más caben justos
    expect(byteBudget(k, 400, 1000, 60_000).ok).toBe(true)
    expect(byteBudget(k, 1, 1000, 60_000).ok).toBe(false)
  })

  it('al caducar la ventana el presupuesto se recupera', () => {
    const k = key()
    byteBudget(k, 1000, 1000, 60_000)
    vi.advanceTimersByTime(60_001)
    expect(byteBudget(k, 1000, 1000, 60_000).ok).toBe(true)
  })

  it('un solo archivo mayor que el presupuesto se rechaza aunque no haya nada consumido', () => {
    expect(byteBudget(key(), 2000, 1000, 60_000)).toEqual({ ok: false, retryAfterSec: 60 })
  })
})

describe('normalizeIp', () => {
  it.each<[string, string]>([
    ['1.2.3.4', '1.2.3.4'],
    [' 1.2.3.4 ', '1.2.3.4'],
    ['1.2.3.4:5555', '1.2.3.4'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['[2001:db8::1]:443', '2001:db8:0:0::/64'],
    ['2001:DB8:1:2:3:4:5:6', '2001:db8:1:2::/64'],
    ['fe80::1%eth0', 'fe80:0:0:0::/64'],
    ['::ffff:1.2.3.4', '1.2.3.4'],
  ])('%j → %j', (raw, expected) => {
    expect(normalizeIp(raw)).toBe(expected)
  })

  it('agrupa todas las direcciones de un mismo /64 bajo la misma clave', () => {
    expect(normalizeIp('2001:db8:1:2:aaaa::1')).toBe(normalizeIp('2001:db8:1:2:bbbb::ffff'))
    expect(normalizeIp('2001:db8:1:2::1')).not.toBe(normalizeIp('2001:db8:1:3::1'))
  })

  it.each(['', 'garbage', '999.1.1.1', '1.2.3', '2001:db8::1::2', 'a'.repeat(70), '<script>'])('rechaza %j', (raw) => {
    expect(normalizeIp(raw)).toBeNull()
  })
})

describe('clientIp y TRUSTED_PROXY_HOPS', () => {
  const xff = 'inventada, 10.0.0.1, 203.0.113.5'

  it('sin la variable definida asume 1 salto y toma la última dirección de X-Forwarded-For', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', undefined)
    expect(trustedProxyHops()).toBe(1)
    expect(clientIp(request({ 'x-forwarded-for': xff }))).toBe('203.0.113.5')
  })

  // Vacía y ausente se comportan igual: es lo que anuncia el aviso de arranque de `productionConfigIssues`
  // ("no está definido (se asume 1)"); antes parseInt('') → NaN → 0 y todas las visitas compartían un contador.
  it('una variable definida pero vacía se trata como ausente (1 salto), como anuncia el aviso de arranque', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '  ')
    expect(trustedProxyHops()).toBe(1)
    expect(clientIp(request({ 'x-forwarded-for': xff }))).toBe('203.0.113.5')
  })

  it('con 2 saltos toma la penúltima (la que añadió el primer proxy propio)', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '2')
    expect(clientIp(request({ 'x-forwarded-for': xff }))).toBe('10.0.0.1')
  })

  it('con más saltos que direcciones cae en el principio de la cabecera, que controla el cliente: si no es IP, "unknown"', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '5')
    expect(clientIp(request({ 'x-forwarded-for': xff }))).toBe('unknown')
  })

  it('con 0 saltos ignora las cabeceras y todo el mundo comparte la clave "local"', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '0')
    expect(clientIp(request({ 'x-forwarded-for': xff, 'x-real-ip': '198.51.100.7' }))).toBe('local')
  })

  it('un valor no numérico o negativo equivale a 0 saltos', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', 'abc')
    expect(trustedProxyHops()).toBe(0)
    vi.stubEnv('TRUSTED_PROXY_HOPS', '-3')
    expect(trustedProxyHops()).toBe(0)
  })

  it('sin X-Forwarded-For usa X-Real-IP, y sin nada devuelve "unknown"', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '1')
    expect(clientIp(request({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7')
    expect(clientIp(request({ 'x-real-ip': 'basura' }))).toBe('unknown')
    expect(clientIp(request())).toBe('unknown')
  })

  it('las IPv6 se agrupan por /64 también aquí', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '1')
    expect(clientIp(request({ 'x-forwarded-for': '2001:db8:1:2:3:4:5:6' }))).toBe('2001:db8:1:2::/64')
  })
})
