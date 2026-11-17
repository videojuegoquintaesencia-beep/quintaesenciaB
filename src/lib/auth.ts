/**
 * Autenticación del panel de administración (una sola contraseña, sesión en cookie httpOnly).
 * Uso en servidor: páginas/layouts de /admin y rutas /api/admin.
 */
import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuthProblems, adminPasswordProblem } from './auth-config'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, readAdminToken, signAdminToken } from './auth-token'
import { getDb } from './db'
import { trustedProxyHops } from './rate-limit'

export { ADMIN_COOKIE }

let warnedDefaultPassword = false
let warnedWeakPassword = false

/** Problemas de configuración que impiden entrar al panel (se registran en el log; no se muestran al visitante). */
export function adminLoginUnavailable(): boolean {
  const problems = adminAuthProblems()
  if (problems.length === 0) return false
  console.error(`[auth] Acceso al panel desactivado: ${problems.join(' ')}`)
  return true
}

function configuredPassword(): string | null {
  const weak = adminPasswordProblem()
  if (weak) {
    if (!warnedWeakPassword) {
      warnedWeakPassword = true
      console.error(`[auth] ${weak}`)
    }
    return null
  }
  const pw = process.env.ADMIN_PASSWORD
  if (pw && pw.length > 0) return pw
  if (process.env.NODE_ENV !== 'production') {
    if (!warnedDefaultPassword) {
      warnedDefaultPassword = true
      console.warn('[auth] ADMIN_PASSWORD no definido: en desarrollo la contraseña del panel es "admin-demo".')
    }
    return 'admin-demo'
  }
  return null
}

/** Comparación en tiempo constante de la contraseña. */
export function checkAdminPassword(input: string): boolean {
  const expected = configuredPassword()
  if (!expected) return false
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ADMIN_SESSION_SECONDS,
}

/** Crea la sesión de administrador (cookie). Llamar desde una ruta/acción de servidor tras comprobar la contraseña. */
export async function startAdminSession(): Promise<void> {
  const token = await signAdminToken()
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, token, adminCookieOptions)
}

/**
 * Cierra la sesión: borra la cookie y REVOCA todas las sesiones iniciadas hasta ahora (el panel tiene una única
 * cuenta), de modo que un token copiado antes del cierre deja de valer aunque no haya caducado.
 */
export async function endAdminSession(): Promise<void> {
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO admin_state (key, value) VALUES ('sessions_revoked_before_ms', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [String(Date.now())],
  })
}

async function revokedBeforeMs(): Promise<number> {
  const db = await getDb()
  const res = await db.execute(`SELECT value FROM admin_state WHERE key = 'sessions_revoked_before_ms'`)
  const value = Number(res.rows[0]?.value ?? 0)
  return Number.isFinite(value) ? value : 0
}

/** Sesión válida: firma y caducidad correctas y no revocada por un cierre de sesión posterior. */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies()
  const claims = await readAdminToken(jar.get(ADMIN_COOKIE)?.value)
  if (!claims) return false
  return claims.issuedMs > (await revokedBeforeMs())
}

/** En páginas/layouts de servidor: redirige al login si no hay sesión. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login')
}

/**
 * En rutas /api/admin: devuelve una Response 401/403 si no hay sesión o el origen no coincide,
 * o `null` si todo está bien. Uso:  const denied = await guardAdminApi(req); if (denied) return denied
 */
export async function guardAdminApi(req: Request): Promise<Response | null> {
  if (!(await isAdmin())) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (req.method !== 'GET' && req.method !== 'HEAD' && !isSameOrigin(req)) {
    return Response.json({ error: 'Origen no permitido' }, { status: 403 })
  }
  return null
}

/**
 * Protección CSRF adicional a SameSite=Lax: el Origin de las peticiones que modifican datos debe ser el propio sitio.
 * `X-Forwarded-Host` solo se tiene en cuenta si hay un proxy propio delante (TRUSTED_PROXY_HOPS > 0): sin proxy
 * lo escribe quien hace la petición.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    const allowed = [req.headers.get('host')]
    if (trustedProxyHops() > 0) allowed.push(req.headers.get('x-forwarded-host'))
    const originHost = new URL(origin).host
    return allowed.some((host) => !!host && host === originHost)
  } catch {
    return false
  }
}
