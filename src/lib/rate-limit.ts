/**
 * Limitador de peticiones en memoria (ventana deslizante simple).
 * Suficiente para una sola instancia; en despliegues con varias instancias conviene
 * sustituirlo por un almacén compartido (Redis/Upstash). El acceso al panel NO usa este módulo:
 * su límite vive en la base de datos (ver lib/admin/login-throttle.ts).
 */
import { isIP } from 'node:net'

type Bucket = { hits: number[]; windowMs: number }
const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 20_000

/** Quita de la memoria los contadores caducados y, si aun así hay demasiados, los más antiguos. */
function prune(now: number) {
  for (const [k, b] of buckets) if (!b.hits.some((t) => now - t < b.windowMs)) buckets.delete(k)
  if (buckets.size > MAX_BUCKETS) {
    let excess = buckets.size - MAX_BUCKETS
    for (const k of buckets.keys()) {
      if (excess-- <= 0) break
      buckets.delete(k)
    }
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const k = key.slice(0, 200) // acota la memoria que puede ocupar una clave
  const hits = (buckets.get(k)?.hits ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(k, { hits, windowMs })
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) }
  }
  hits.push(now)
  buckets.set(k, { hits, windowMs })
  if (buckets.size > 5000) prune(now)
  return { ok: true, retryAfterSec: 0 }
}

/* ───────────── Presupuesto de bytes (subidas) ───────────── */

const budgets = new Map<string, { at: number; bytes: number }[]>()

/**
 * Limita los BYTES que una clave puede enviar en una ventana. `consume` solo descuenta si cabe.
 * Complementa al límite de número de subidas: 80 archivos de 12 MB serían casi 1 GB por IP.
 */
export function byteBudget(key: string, bytes: number, limitBytes: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const k = key.slice(0, 200)
  const entries = (budgets.get(k) ?? []).filter((e) => now - e.at < windowMs)
  const used = entries.reduce((n, e) => n + e.bytes, 0)
  if (used + bytes > limitBytes) {
    budgets.set(k, entries)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - (entries[0]?.at ?? now))) / 1000)) }
  }
  entries.push({ at: now, bytes })
  budgets.set(k, entries)
  if (budgets.size > 5000) {
    for (const [name, list] of budgets) if (!list.some((e) => now - e.at < windowMs)) budgets.delete(name)
    if (budgets.size > MAX_BUCKETS) for (const name of [...budgets.keys()].slice(0, budgets.size - MAX_BUCKETS)) budgets.delete(name)
  }
  return { ok: true, retryAfterSec: 0 }
}

/* ───────────── IP del cliente ───────────── */

/** Expande una IPv6 a sus 8 grupos de 16 bits (o null si no es válida). */
function expandIpv6(ip: string): number[] | null {
  const [head, tail, ...rest] = ip.split('::')
  if (rest.length > 0) return null
  const toGroups = (part: string) => (part === '' ? [] : part.split(':'))
  const left = toGroups(head)
  const right = tail === undefined ? [] : toGroups(tail)
  // Una IPv4 incrustada al final ocupa dos grupos.
  const last = (tail === undefined ? left : right).at(-1)
  if (last?.includes('.')) {
    const v4 = last.split('.').map(Number)
    const list = tail === undefined ? left : right
    list.splice(-1, 1, ((v4[0] << 8) | v4[1]).toString(16), ((v4[2] << 8) | v4[3]).toString(16))
  }
  const missing = 8 - left.length - right.length
  if (tail === undefined ? left.length !== 8 : missing < 1) return null
  const groups = tail === undefined ? left : [...left, ...Array<string>(missing).fill('0'), ...right]
  const numbers = groups.map((g) => Number.parseInt(g, 16))
  return numbers.length === 8 && numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? numbers : null
}

/**
 * Normaliza una IP recibida en una cabecera: quita puerto y corchetes, comprueba que es una IP de verdad
 * (descarta texto arbitrario) y agrupa las IPv6 por su prefijo /64, porque un solo cliente controla millones
 * de direcciones dentro de su /64 y, si no, rotaría de "IP" a voluntad. Devuelve null si no es una IP.
 */
export function normalizeIp(raw: string): string | null {
  let ip = raw.trim()
  if (ip.length === 0 || ip.length > 64) return null
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip)
  if (bracketed) ip = bracketed[1]
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'))
  ip = ip.replace(/%.*$/, '') // zona IPv6 (fe80::1%eth0)

  const version = isIP(ip)
  if (version === 4) return ip
  if (version !== 6) return null
  const groups = expandIpv6(ip.toLowerCase())
  if (!groups) return null
  // IPv4 mapeada en IPv6 (::ffff:a.b.c.d): es la misma IPv4.
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`
  }
  return `${groups.slice(0, 4).map((g) => g.toString(16)).join(':')}::/64`
}

/** Nº de proxies de confianza delante de la app (variable TRUSTED_PROXY_HOPS; por defecto 1). */
export function trustedProxyHops(): number {
  return Math.max(0, Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '1', 10) || 0)
}

/**
 * IP del cliente. Un cliente puede inventarse el principio de `X-Forwarded-For`, pero cada proxy
 * de confianza añade al FINAL la IP de quien le conectó. Por eso se cuenta desde el final:
 * `TRUSTED_PROXY_HOPS` (por defecto 1) es el número de proxies propios delante de la app
 * (0 = sin proxy: se ignoran las cabeceras y todo cuenta como una sola IP).
 *
 * El valor elegido debe ser una IP válida; si no (cabecera ausente o con basura), todos esos clientes
 * comparten la clave "unknown", así que inventar valores no abre contadores nuevos.
 * Para el panel de administración además hay un tope global que no depende de este dato.
 */
export function clientIp(req: Request): string {
  const hops = trustedProxyHops()
  if (hops === 0) return 'local'
  const parts = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const raw = parts.length > 0 ? parts[Math.max(0, parts.length - hops)] : (req.headers.get('x-real-ip') ?? '')
  return normalizeIp(raw) ?? 'unknown'
}
