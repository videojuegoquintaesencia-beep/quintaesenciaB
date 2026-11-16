/**
 * Limitador de peticiones en memoria (ventana deslizante simple).
 * Suficiente para una sola instancia; en despliegues con varias instancias conviene
 * sustituirlo por un almacén compartido (Redis/Upstash).
 */
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) }
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k)
  }
  return { ok: true, retryAfterSec: 0 }
}

/**
 * IP del cliente. Un cliente puede inventarse el principio de `X-Forwarded-For`, pero cada proxy
 * de confianza añade al FINAL la IP de quien le conectó. Por eso se cuenta desde el final:
 * `TRUSTED_PROXY_HOPS` (por defecto 1) es el número de proxies propios delante de la app
 * (0 = sin proxy: se ignoran las cabeceras y todo cuenta como una sola IP).
 */
export function clientIp(req: Request): string {
  const hops = Math.max(0, Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '1', 10) || 0)
  if (hops === 0) return 'local'
  const parts = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length > 0) return parts[Math.max(0, parts.length - hops)]
  return req.headers.get('x-real-ip')?.trim() || 'local'
}
