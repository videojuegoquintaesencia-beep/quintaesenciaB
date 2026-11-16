/**
 * Token de sesión del panel de administración (JWT firmado con HS256).
 * Este módulo NO importa `next/headers`, así que se puede usar desde `proxy.ts`.
 */
import { SignJWT, jwtVerify } from 'jose'

export const ADMIN_COOKIE = 'pu_admin'
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12

let warned = false

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET no está definido o es demasiado corto (mínimo 32 caracteres).')
  }
  if (!warned) {
    warned = true
    console.warn('[auth] SESSION_SECRET no definido: usando una clave de desarrollo NO segura.')
  }
  return new TextEncoder().encode('dev-only-insecure-session-secret-change-me-0123456789')
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_SECONDS}s`)
    .sign(secretKey())
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    return payload.role === 'admin'
  } catch {
    return false
  }
}
