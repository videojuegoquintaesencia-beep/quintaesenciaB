import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
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

  if (!(await getQuote(target.id))) return jsonError('No encontrado', 404)
  const updated = await updateQuote(target.id, body.data)
  if (!updated) return jsonError('No encontrado', 404)

  // El aviso de "nuevos" del menú está en el layout.
  revalidatePath('/admin', 'layout')
  return Response.json({ ok: true, status: updated.status })
}
