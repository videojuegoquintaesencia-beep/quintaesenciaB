/**
 * Limita los intentos FALLIDOS de entrada al panel: 5 cada 15 minutos por IP.
 * (Un acierto borra el contador.) En memoria: suficiente para una sola instancia.
 */
import 'server-only'

export const MAX_FAILED_LOGINS = 5
export const LOGIN_WINDOW_MS = 15 * 60 * 1000

type G = typeof globalThis & { __puLoginFailures?: Map<string, number[]> }
const g = globalThis as G
const failures = (g.__puLoginFailures ??= new Map<string, number[]>())

function recent(ip: string, now: number): number[] {
  return (failures.get(ip) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS)
}

/** Segundos que faltan para poder reintentar, o 0 si la IP no está bloqueada. */
export function loginRetryAfterSec(ip: string, now = Date.now()): number {
  const hits = recent(ip, now)
  if (hits.length < MAX_FAILED_LOGINS) return 0
  return Math.max(1, Math.ceil((LOGIN_WINDOW_MS - (now - hits[0])) / 1000))
}

export function recordLoginFailure(ip: string, now = Date.now()): void {
  failures.set(ip, [...recent(ip, now), now])
  if (failures.size > 2000) {
    for (const [key, hits] of failures) if (!hits.some((t) => now - t < LOGIN_WINDOW_MS)) failures.delete(key)
  }
}

export function clearLoginFailures(ip: string): void {
  failures.delete(ip)
}
