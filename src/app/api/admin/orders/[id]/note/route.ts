import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
import { getOrderById, updateAdminNote } from '@/lib/orders'
import { jsonError, parseJsonBody, routeId } from '@/lib/admin/api'
import { orderNoteSchema } from '@/lib/admin/schemas'

export const runtime = 'nodejs'

/** Guarda la nota interna del pedido (nunca la ve el cliente). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const target = await routeId(ctx)
  if ('response' in target) return target.response
  const body = await parseJsonBody(req, orderNoteSchema)
  if (!body.ok) return body.response

  if (!(await getOrderById(target.id))) return jsonError('Pedido no encontrado', 404)
  await updateAdminNote(target.id, body.data.note)
  revalidatePath(`/admin/pedidos/${target.id}`)
  return Response.json({ ok: true })
}
