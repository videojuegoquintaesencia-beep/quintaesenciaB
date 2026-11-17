/**
 * Mantenimiento periódico de la base de datos, sin necesidad de un cron externo.
 *
 *  - Borra los archivos subidos que nunca llegaron a un pedido/presupuesto (carritos abandonados).
 *  - Borra los pedidos que nunca se pagaron (con sus datos personales y archivos) pasado un plazo.
 *  - Limpia los intentos de acceso al panel ya caducados.
 *
 * Se invoca tras las subidas y los pedidos, pero como mucho una vez por hora y por proceso
 * (determinista: ya no depende del azar). En hosting serverless cada instancia aplica su propio
 * intervalo, lo que basta porque las operaciones son idempotentes.
 */
import 'server-only'
import { purgeOrphanFiles } from './files'
import { purgeLoginAttempts } from './admin/login-throttle'
import { purgeUnpaidOrders } from './orders'

const INTERVAL_MS = 60 * 60_000

type G = typeof globalThis & { __puMaintenanceAt?: number; __puMaintenanceRunning?: boolean }
const g = globalThis as G

/** Ejecuta el mantenimiento si hace más de una hora que no se hace. Nunca lanza. */
export async function runMaintenanceIfDue(now = Date.now()): Promise<void> {
  if (g.__puMaintenanceRunning || (g.__puMaintenanceAt && now - g.__puMaintenanceAt < INTERVAL_MS)) return
  g.__puMaintenanceRunning = true
  g.__puMaintenanceAt = now
  try {
    const files = await purgeOrphanFiles()
    const orders = await purgeUnpaidOrders()
    await purgeLoginAttempts()
    if (files > 0 || orders > 0) console.log(`[mantenimiento] Archivos huérfanos borrados: ${files}. Pedidos sin pagar borrados: ${orders}.`)
  } catch (err) {
    g.__puMaintenanceAt = undefined // reintentar en la próxima ocasión
    console.error('[mantenimiento] Error:', err instanceof Error ? err.message : err)
  } finally {
    g.__puMaintenanceRunning = false
  }
}
