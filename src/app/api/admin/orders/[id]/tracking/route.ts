import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
import { addOrderEvent, getOrderById, updateTracking } from '@/lib/orders'
import { jsonError, parseJsonBody, routeId } from '@/lib/admin/api'
import { trackingSchema } from '@/lib/admin/schemas'
import { notifyOrderCustomer } from '@/lib/admin/notify'

export const runtime = 'nodejs'

/** Añade o corrige el transportista y el código de seguimiento (sin cambiar el estado). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const target = await routeId(ctx)
  if ('response' in target) return target.response
  const body = await parseJsonBody(req, trackingSchema)
  if (!body.ok) return body.response
  const { carrier, trackingCode, notify } = body.data

  const order = await getOrderById(target.id)
  if (!order) return jsonError('Pedido no encontrado', 404)
  if (order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'ready' && order.status !== 'in_production')
    return jsonError('Solo se puede añadir seguimiento a pedidos en producción, listos o enviados.', 409)

  await updateTracking(target.id, carrier, trackingCode)
  await addOrderEvent(target.id, `Seguimiento actualizado: ${carrier ? `${carrier} · ` : ''}${trackingCode}`, 'admin')

  const updated = notify ? await getOrderById(target.id) : null
  const notice = updated ? await notifyOrderCustomer(updated) : { email: 'skipped' as const }

  revalidatePath(`/admin/pedidos/${target.id}`)
  return Response.json({ ok: true, ...notice, emailTo: order.email })
}
