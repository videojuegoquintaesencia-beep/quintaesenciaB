import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
import { sendInvoiceEmail } from '@/lib/emails/order'
import { getInvoiceRecord, issueInvoice, issueRectification, recordInvoiceSent } from '@/lib/invoices'
import { getOrderById } from '@/lib/orders'
import { jsonError, parseJsonBody, routeId } from '@/lib/admin/api'
import { invoiceActionSchema } from '@/lib/admin/schemas'

export const runtime = 'nodejs'

/**
 * Factura del pedido. `action`:
 *  - "issue" (por defecto): emite la factura; si ya existe devuelve la misma (idempotente).
 *  - "rectify": emite la rectificativa de un pedido reembolsado o cancelado con factura (también idempotente).
 *  - "send": envía al cliente el enlace a su factura (o a la rectificativa, si existe) y lo anota en el historial.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const target = await routeId(ctx)
  if ('response' in target) return target.response
  const body = await parseJsonBody(req, invoiceActionSchema)
  if (!body.ok) return body.response

  if (body.data.action === 'send') {
    const [order, record] = await Promise.all([getOrderById(target.id), getInvoiceRecord(target.id)])
    if (!order) return jsonError('Pedido no encontrado', 404)
    if (!record) return jsonError('Este pedido todavía no tiene factura: emítela primero.', 409)
    const doc = record.rectification ?? record.invoice
    let sent: Awaited<ReturnType<typeof sendInvoiceEmail>>
    try {
      sent = await sendInvoiceEmail(order, record)
    } catch (err) {
      sent = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
    if (sent.ok) await recordInvoiceSent(target.id, doc.number, order.email, !!sent.simulated)
    revalidatePath(`/admin/pedidos/${target.id}`)
    return Response.json({
      ok: true,
      number: doc.number,
      email: sent.ok ? (sent.simulated ? 'simulated' : 'sent') : 'failed',
      emailTo: order.email,
      ...(sent.error ? { emailError: sent.error } : {}),
    })
  }

  const result = body.data.action === 'rectify' ? await issueRectification(target.id) : await issueInvoice(target.id)
  if (!result.ok) return jsonError(result.error, result.status)
  const doc = body.data.action === 'rectify' ? result.record.rectification : result.record.invoice
  if (!doc) return jsonError('No se pudo emitir la factura', 500)
  revalidatePath(`/admin/pedidos/${target.id}`)
  return Response.json({ ok: true, created: result.created, number: doc.number, issuedAt: doc.issuedAt })
}
