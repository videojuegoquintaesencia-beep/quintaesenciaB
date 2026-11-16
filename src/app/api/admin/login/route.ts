import { checkAdminPassword, isSameOrigin, startAdminSession } from '@/lib/auth'
import { clientIp } from '@/lib/rate-limit'
import { jsonError, parseJsonBody } from '@/lib/admin/api'
import { clearLoginFailures, loginRetryAfterSec, recordLoginFailure } from '@/lib/admin/login-throttle'
import { loginSchema } from '@/lib/admin/schemas'

export const runtime = 'nodejs'

const FAILURE_DELAY_MS = 400

/** Entrada al panel: contraseña única, comparación en tiempo constante y 5 fallos por IP cada 15 minutos. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origen no permitido', 403)

  const ip = clientIp(req)
  const retryAfter = loginRetryAfterSec(ip)
  if (retryAfter > 0) {
    return jsonError(
      `Demasiados intentos fallidos. Vuelve a probar en ${Math.ceil(retryAfter / 60)} min.`,
      429,
      { 'Retry-After': String(retryAfter) },
    )
  }

  const body = await parseJsonBody(req, loginSchema)
  if (!body.ok) return body.response

  if (!checkAdminPassword(body.data.password)) {
    recordLoginFailure(ip)
    // Pequeña espera para encarecer la fuerza bruta; el mensaje es el mismo pase lo que pase.
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS))
    return jsonError('Contraseña incorrecta.', 401)
  }

  clearLoginFailures(ip)
  await startAdminSession()
  return Response.json({ ok: true })
}
