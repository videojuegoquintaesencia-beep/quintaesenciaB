/**
 * Autenticación del panel de administración (una sola contraseña, sesión en cookie httpOnly).
 * Uso en servidor: páginas/layouts de /admin y rutas /api/admin.
 */
import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, signAdminToken, verifyAdminToken } from './auth-token'

export { ADMIN_COOKIE }

let warnedDefaultPassword = false

function configuredPassword(): string | null {
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

export async function endAdminSession(): Promise<void> {
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 })
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies()
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value)
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

/** Protección CSRF adicional a SameSite=Lax: el Origin de las peticiones que modifican datos debe ser el propio sitio. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}
