/**
 * Operaciones de pedidos propias del panel que `src/lib/orders.ts` no cubre (solo servidor).
 */
import 'server-only'
import { getDb, nowIso } from '@/lib/db'

/**
 * Cuando el panel pasa un pedido de "pendiente de pago" a "pagado" a mano, `updateOrderStatus` solo cambia el
 * estado: aquí se registra además el cobro (fecha y estado del pago) para que los ingresos del resumen lo cuenten.
 * No pisa un pago que ya tuviera fecha.
 */
export async function recordManualPayment(orderId: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `UPDATE orders SET payment_status = 'captured', paid_at = COALESCE(paid_at, ?) WHERE id = ?`,
    args: [nowIso(), orderId],
  })
}
