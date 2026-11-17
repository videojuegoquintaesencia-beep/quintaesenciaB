import { adminLoginUnavailable, checkAdminPassword, isSameOrigin, startAdminSession } from '@/lib/auth'
import { clientIp } from '@/lib/rate-limit'
import { jsonError, parseJsonBody } from '@/lib/admin/api'
import { beginLoginAttempt, releaseLoginAttempt } from '@/lib/admin/login-throttle'
import { loginSchema } from '@/lib/admin/schemas'

export const runtime = 'nodejs'

const FAILURE_DELAY_MS = 400

/**
 * Entrada al panel: contraseña única y comparación en tiempo constante. Límites de intentos (guardados en la
 * base de datos): 5 por IP y 30 en total cada 15 minutos; el total no depende de que la IP sea fiable.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origen no permitido', 403)

  // Configuración de producción inválida (sin contraseña o secretos débiles): el detalle va al log, no al visitante.
  if (adminLoginUnavailable()) return jsonError('El acceso al panel no está disponible ahora mismo.', 503)

  const attempt = await beginLoginAttempt(clientIp(req))
  if (!attempt.allowed) {
    return jsonError(
      `Demasiados intentos fallidos. Vuelve a probar en ${Math.ceil(attempt.retryAfterSec / 60)} min.`,
      429,
      { 'Retry-After': String(attempt.retryAfterSec) },
    )
  }

  const body = await parseJsonBody(req, loginSchema)
  if (!body.ok) {
    await releaseLoginAttempt(attempt.id) // una petición mal formada no gasta un intento
    return body.response
  }

  if (!checkAdminPassword(body.data.password)) {
    // El intento ya está registrado como fallo. Pequeña espera para encarecer la fuerza bruta; el mensaje
    // es el mismo pase lo que pase.
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS))
    return jsonError('Contraseña incorrecta.', 401)
  }

  await releaseLoginAttempt(attempt.id, clientIp(req))
  await startAdminSession()
  return Response.json({ ok: true })
}
