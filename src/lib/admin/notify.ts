/** Aviso por email al cliente tras un cambio en su pedido (solo servidor). */
import 'server-only'
import { sendOrderStatusUpdate } from '@/lib/emails/order'
import type { Order } from '@/lib/orders'

type EmailOutcome = 'sent' | 'simulated' | 'failed' | 'skipped'

/** Nunca lanza: el resultado del correo se devuelve al panel para mostrarlo, pero no deshace nada. */
export async function notifyOrderCustomer(
  order: Order,
  note?: string,
): Promise<{ email: EmailOutcome; emailError?: string }> {
  try {
    const sent = await sendOrderStatusUpdate(order, { note: note || undefined })
    return { email: sent.ok ? (sent.simulated ? 'simulated' : 'sent') : 'failed', emailError: sent.error }
  } catch (err) {
    return { email: 'failed', emailError: err instanceof Error ? err.message : String(err) }
  }
}
