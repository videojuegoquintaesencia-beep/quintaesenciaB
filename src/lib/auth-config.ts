/**
 * Comprobación de la configuración de acceso al panel. Sin dependencias de servidor, así que la pueden
 * usar `auth-token.ts` (proxy.ts), `auth.ts` y `instrumentation.ts`.
 *
 * En producción exigimos secretos razonables: ADMIN_PASSWORD de al menos 12 caracteres y SESSION_SECRET de al
 * menos 32, y ninguno formado por muy pocos caracteres distintos (p. ej. "xxxxxxxxxxxx"). En desarrollo no se
 * exige nada (hay valores por defecto para trabajar).
 */

import { sitePlaceholders, type OwnerValues } from '@/config/site'

export const MIN_ADMIN_PASSWORD_LENGTH = 12
export const MIN_SESSION_SECRET_LENGTH = 32

const isProduction = () => process.env.NODE_ENV === 'production'

/** true si el valor tiene tan pocos caracteres distintos que es trivial ("aaaaaaaaaaaa", "abababababab"). */
export function isTrivialSecret(value: string): boolean {
  return new Set(value).size < 5
}

/** Motivo por el que ADMIN_PASSWORD no vale en producción, o null si es aceptable (o no es producción). */
export function adminPasswordProblem(): string | null {
  if (!isProduction()) return null
  const pw = process.env.ADMIN_PASSWORD ?? ''
  if (pw.length === 0) return 'ADMIN_PASSWORD no está definido: el panel /admin queda inaccesible.'
  if (pw.length < MIN_ADMIN_PASSWORD_LENGTH)
    return `ADMIN_PASSWORD es demasiado corto (mínimo ${MIN_ADMIN_PASSWORD_LENGTH} caracteres): el panel /admin queda inaccesible.`
  if (isTrivialSecret(pw)) return 'ADMIN_PASSWORD es demasiado simple (muy pocos caracteres distintos): el panel /admin queda inaccesible.'
  return null
}

/** Motivo por el que SESSION_SECRET no vale en producción, o null si es aceptable (o no es producción). */
export function sessionSecretProblem(): string | null {
  if (!isProduction()) return null
  const secret = process.env.SESSION_SECRET ?? ''
  if (secret.length === 0) return 'SESSION_SECRET no está definido: nadie puede iniciar sesión en /admin.'
  if (secret.length < MIN_SESSION_SECRET_LENGTH)
    return `SESSION_SECRET es demasiado corto (mínimo ${MIN_SESSION_SECRET_LENGTH} caracteres): nadie puede iniciar sesión en /admin.`
  if (isTrivialSecret(secret)) return 'SESSION_SECRET es demasiado simple (muy pocos caracteres distintos): nadie puede iniciar sesión en /admin.'
  return null
}

/** Problemas de configuración que impiden entrar al panel (vacío si todo está bien). */
export function adminAuthProblems(): string[] {
  return [adminPasswordProblem(), sessionSecretProblem()].filter((p): p is string => p !== null)
}

/**
 * Avisos de configuración de producción para mostrar al arrancar el servidor. `owner` son los datos del titular y de
 * contacto efectivos (los del panel sobre los del código); sin él se miran solo los del código. La variante que lee
 * los ajustes guardados está en `lib/production-checks.ts` (este módulo no puede tocar la base de datos).
 */
export function productionConfigIssues(owner?: OwnerValues): { level: 'error' | 'warn'; message: string }[] {
  if (!isProduction()) return []
  const issues: { level: 'error' | 'warn'; message: string }[] = adminAuthProblems().map((message) => ({ level: 'error', message }))
  const env = process.env
  const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? '').trim()
  if (siteUrl === '' || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(siteUrl)) {
    issues.push({
      level: 'error',
      message:
        'NEXT_PUBLIC_SITE_URL no está definido (o apunta a localhost): los enlaces de los emails (seguimiento del pedido, panel), el sitemap y las URL canónicas saldrán con http://localhost:3000. Defínelo con el dominio público (https://…) ANTES de compilar (next build).',
    })
  }
  const placeholders = sitePlaceholders(owner)
  if (placeholders.length > 0) {
    issues.push({
      level: 'error',
      message: `Completa los datos del titular y de contacto antes de publicar (panel → Ajustes, o src/config/site.ts): siguen siendo datos de ejemplo ${placeholders.join(', ')}. El aviso legal (art. 10 LSSI-CE) y los emails saldrían con datos ficticios.`,
    })
  }
  if (env.TRUSTED_PROXY_HOPS === undefined || env.TRUSTED_PROXY_HOPS.trim() === '') {
    issues.push({
      level: 'warn',
      message:
        'TRUSTED_PROXY_HOPS no está definido (se asume 1). Indica cuántos proxies tuyos hay delante de la app (0 si ninguno) o los límites de peticiones por IP se podrán saltar.',
    })
  }
  const paypalConfigured = !!env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && !!env.PAYPAL_CLIENT_SECRET
  if (paypalConfigured && !(env.PAYPAL_WEBHOOK_ID ?? '').trim()) {
    issues.push({ level: 'warn', message: 'PAYPAL_WEBHOOK_ID no está definido: el webhook de PayPal se rechaza (solo funcionará la captura desde el navegador).' })
  }
  if (env.ALLOW_DEMO_PAYMENTS === 'true') {
    issues.push({ level: 'error', message: 'ALLOW_DEMO_PAYMENTS=true: se aceptan pagos simulados. NO lo uses con clientes reales.' })
  }
  if (!env.SMTP_HOST) {
    issues.push({ level: 'warn', message: 'SMTP_HOST no está definido: los emails (confirmaciones, avisos) NO se envían a nadie.' })
  }
  // El panel permite dejar el email de contacto vacío: entonces los avisos internos y el remitente dependen de las variables.
  if (owner && owner.contact.email === '') {
    const consequences = [
      !env.ADMIN_NOTIFY_EMAIL ? 'sin ADMIN_NOTIFY_EMAIL no se envía ningún aviso interno de pedidos, presupuestos ni mensajes' : null,
      env.SMTP_HOST && !env.MAIL_FROM ? 'sin MAIL_FROM los emails saldrían sin una dirección de remitente válida' : null,
    ].filter((m): m is string => m !== null)
    if (consequences.length > 0) {
      issues.push({
        level: env.ADMIN_NOTIFY_EMAIL ? 'warn' : 'error',
        message: `El email de contacto está vacío en los ajustes del panel: ${consequences.join(' y ')}. Rellénalo en Ajustes → Contacto y redes o define esas variables.`,
      })
    }
  }
  if ((env.DATABASE_URL ?? 'file:').startsWith('file:')) {
    issues.push({ level: 'warn', message: 'DATABASE_URL apunta a un archivo local: en hosting sin disco persistente (p. ej. Vercel) se perderán los datos. Usa Turso.' })
  }
  return issues
}
