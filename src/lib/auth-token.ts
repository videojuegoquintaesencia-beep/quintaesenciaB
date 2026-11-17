/**
 * Token de sesión del panel de administración (JWT firmado con HS256).
 * Este módulo NO importa `next/headers`, así que se puede usar desde `proxy.ts`.
 */
import { SignJWT, jwtVerify } from 'jose'
import { sessionSecretProblem } from './auth-config'

/**
 * Nombre de la cookie. En producción lleva el prefijo `__Host-`: el navegador solo la acepta con `Secure`,
 * `Path=/` y sin `Domain`, así que ningún subdominio ni conexión sin cifrar puede sobrescribirla.
 */
export const ADMIN_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pu_admin' : 'pu_admin'
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12

let warned = false

function secretKey(): Uint8Array {
  const problem = sessionSecretProblem()
  if (problem) throw new Error(problem)
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret)
  if (!warned) {
    warned = true
    console.warn('[auth] SESSION_SECRET no definido: usando una clave de desarrollo NO segura.')
  }
  return new TextEncoder().encode('dev-only-insecure-session-secret-change-me-0123456789')
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin', issuedMs: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_SECONDS}s`)
    .sign(secretKey())
}

export interface AdminClaims {
  /** Milisegundos (época) en los que se inició la sesión; sirve para revocar sesiones anteriores. */
  issuedMs: number
}

/** Verifica firma, algoritmo, caducidad (exigida) y rol. Devuelve los datos de la sesión o null. */
export async function readAdminToken(token: string | undefined | null): Promise<AdminClaims | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'], requiredClaims: ['exp', 'iat'] })
    if (payload.role !== 'admin') return null
    const issuedMs = typeof payload.issuedMs === 'number' ? payload.issuedMs : (payload.iat ?? 0) * 1000
    return { issuedMs }
  } catch {
    return null
  }
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  return (await readAdminToken(token)) !== null
}
