import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
import { statusesForKind } from '@/lib/order-status'
import { getQuote, updateQuote } from '@/lib/quotes'
import { jsonError, parseJsonBody, routeId } from '@/lib/admin/api'
import { quoteUpdateSchema } from '@/lib/admin/schemas'

export const runtime = 'nodejs'

/** Cambia el estado y/o la nota interna de un presupuesto o mensaje. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const target = await routeId(ctx)
  if ('response' in target) return target.response
  const body = await parseJsonBody(req, quoteUpdateSchema)
  if (!body.ok) return body.response

  const existing = await getQuote(target.id)
  if (!existing) return jsonError('No encontrado', 404)
  // Un mensaje de contacto no se presupuesta ni se gana o se pierde: esos estados solo valen para presupuestos.
  if (body.data.status && body.data.status !== existing.status && !statusesForKind(existing.kind).includes(body.data.status)) {
    return jsonError('Ese estado no es válido para un mensaje de contacto.', 400)
  }
  const updated = await updateQuote(target.id, body.data)
  if (!updated) return jsonError('No encontrado', 404)

  // El aviso de "nuevos" del menú está en el layout.
  revalidatePath('/admin', 'layout')
  return Response.json({ ok: true, status: updated.status })
}
