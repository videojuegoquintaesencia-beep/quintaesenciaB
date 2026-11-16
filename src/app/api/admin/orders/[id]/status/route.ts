import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'
import { getOrderById, updateOrderStatus } from '@/lib/orders'
import { jsonError, parseJsonBody, routeId } from '@/lib/admin/api'
import { notifyOrderCustomer } from '@/lib/admin/notify'
import { recordManualPayment } from '@/lib/admin/orders-admin'
import { statusChangeSchema } from '@/lib/admin/schemas'

export const runtime = 'nodejs'

/**
 * Cambia el estado de un pedido. `updateOrderStatus` rechaza las transiciones imposibles; si se pide avisar,
 * se envía el email DESPUÉS de guardar (un fallo de correo nunca deshace el cambio de estado).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const target = await routeId(ctx)
  if ('response' in target) return target.response
  const body = await parseJsonBody(req, statusChangeSchema)
  if (!body.ok) return body.response
  const { status, note, carrier, trackingCode, notify } = body.data

  const current = await getOrderById(target.id)
  if (!current) return jsonError('Pedido no encontrado', 404)
  const wasUnpaid = current.status === 'pending_payment'

  const result = await updateOrderStatus(target.id, status, {
    note: note || (wasUnpaid && status === 'paid' ? 'Marcado como pagado a mano desde el panel' : undefined),
    // Transportista y seguimiento solo se guardan al enviar el pedido.
    carrier: status === 'shipped' ? carrier : undefined,
    trackingCode: status === 'shipped' ? trackingCode : undefined,
    actor: 'admin',
  })
  if (!result.ok) return jsonError(result.error, 409)

  if (wasUnpaid && status === 'paid') await recordManualPayment(target.id)

  const notice = notify ? await notifyOrderCustomer(result.order, note) : { email: 'skipped' as const }

  revalidatePath('/admin', 'layout')
  return Response.json({
    ok: true,
    status: result.order.status,
    statusLabel: ORDER_STATUS_LABEL[result.order.status],
    ...notice,
    emailTo: result.order.email,
  })
}
