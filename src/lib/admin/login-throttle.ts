/**
 * Limita los intentos de entrada al panel. Se guarda en la base de datos (compartida entre instancias y
 * reinicios), con DOS topes en una ventana de 15 minutos:
 *   - por IP: 5 intentos;
 *   - global (todas las IP juntas): 30 intentos. Este tope no depende de que la IP sea fiable, así que la
 *     fuerza bruta distribuida o con cabeceras `X-Forwarded-For` inventadas sigue acotada.
 *
 * Cada intento reserva su plaza ANTES de comprobar la contraseña (inserta y luego cuenta), de modo que una
 * ráfaga de peticiones paralelas no puede colarse entre la comprobación y el registro del fallo. Si la
 * contraseña es correcta, el intento se borra (y los fallos previos de esa IP).
 */
import 'server-only'
import { getDb } from '@/lib/db'

export const MAX_FAILED_LOGINS = 5
export const MAX_FAILED_LOGINS_GLOBAL = 30
export const LOGIN_WINDOW_MS = 15 * 60 * 1000

export type LoginAttempt = { allowed: true; id: number } | { allowed: false; retryAfterSec: number }

/** Reserva un intento de acceso. Si se superan los topes, no se registra y devuelve cuánto esperar. */
export async function beginLoginAttempt(ip: string, now = Date.now()): Promise<LoginAttempt> {
  const db = await getDb()
  const since = now - LOGIN_WINDOW_MS
  const inserted = await db.execute({ sql: `INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)`, args: [ip, now] })
  const id = Number(inserted.lastInsertRowid)
  const counts = await db.execute({
    sql: `SELECT COUNT(*) AS total, COALESCE(SUM(ip = ?), 0) AS mine FROM login_attempts WHERE created_at > ?`,
    args: [ip, since],
  })
  const total = Number(counts.rows[0]?.total ?? 0)
  const mine = Number(counts.rows[0]?.mine ?? 0)
  if (mine <= MAX_FAILED_LOGINS && total <= MAX_FAILED_LOGINS_GLOBAL) return { allowed: true, id }

  // Bloqueado: este intento no cuenta (si no, quien insiste prolongaría su propio bloqueo sin fin).
  await db.execute({ sql: `DELETE FROM login_attempts WHERE id = ?`, args: [id] })
  const scopes: { sql: string; args: (string | number)[] }[] = []
  if (mine > MAX_FAILED_LOGINS)
    scopes.push({ sql: `SELECT created_at FROM login_attempts WHERE ip = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1 OFFSET ?`, args: [ip, since, MAX_FAILED_LOGINS - 1] })
  if (total > MAX_FAILED_LOGINS_GLOBAL)
    scopes.push({ sql: `SELECT created_at FROM login_attempts WHERE created_at > ? ORDER BY created_at DESC LIMIT 1 OFFSET ?`, args: [since, MAX_FAILED_LOGINS_GLOBAL - 1] })
  let retryAfterSec = 1
  for (const scope of scopes) {
    const row = (await db.execute(scope)).rows[0]
    // El bloqueo termina cuando caduca el intento más antiguo de los que ocupan el cupo.
    if (row) retryAfterSec = Math.max(retryAfterSec, Math.ceil((LOGIN_WINDOW_MS - (now - Number(row.created_at))) / 1000))
  }
  return { allowed: false, retryAfterSec }
}

/** Libera la plaza de un intento que no llegó a comprobarse (petición mal formada) o que fue correcto. */
export async function releaseLoginAttempt(id: number, clearIp?: string): Promise<void> {
  const db = await getDb()
  await db.execute({ sql: `DELETE FROM login_attempts WHERE id = ?`, args: [id] })
  if (clearIp) await db.execute({ sql: `DELETE FROM login_attempts WHERE ip = ?`, args: [clearIp] })
}

/** Borra los intentos ya caducados. */
export async function purgeLoginAttempts(now = Date.now()): Promise<void> {
  const db = await getDb()
  await db.execute({ sql: `DELETE FROM login_attempts WHERE created_at <= ?`, args: [now - LOGIN_WINDOW_MS] })
}
