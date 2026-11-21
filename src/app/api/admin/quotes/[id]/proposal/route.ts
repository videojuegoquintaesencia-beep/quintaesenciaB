import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { guardAdminApi } from '@/lib/auth'
import { absoluteUrl } from '@/lib/email'
import { proposalPagePath, sendQuoteProposal } from '@/lib/emails/quote'
import { buildProposal, markProposalSent, proposalInputSchema } from '@/lib/proposal'
import { isLiveQuoteOrder, loadQuoteOrder } from '@/lib/quote-accept'
import { getQuote, markQuoteProposalSent, saveQuoteProposal } from '@/lib/quotes'
import { getCatalog } from '@/lib/settings'
import { jsonError, parseJsonBody, routeId } from '@/lib/admin/api'

export const runtime = 'nodejs'

const bodySchema = z.object({
  /** "save" guarda el borrador; "send" guarda, fija la validez, genera el enlace y envía el email al cliente. */
  action: z.enum(['save', 'send'], { error: 'Acción no válida' }),
  proposal: proposalInputSchema,
})

/**
 * POST /api/admin/quotes/[id]/proposal  { action: "save" | "send", proposal }
 * Guarda o envía la propuesta de precio de un presupuesto. Los totales se calculan aquí.
 * → { ok, proposal, publicUrl?, email? }   (email: "sent" | "simulated" | "failed")
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const target = await routeId(ctx)
  if ('response' in target) return target.response
  const body = await parseJsonBody(req, bodySchema)
  if (!body.ok) return body.response

  const quote = await getQuote(target.id)
  if (!quote || quote.kind !== 'quote') return jsonError('No encontrado', 404)
  // Una propuesta aceptada (con pedido vivo) es inmutable: lo que pagó el cliente es lo que se fabrica.
  const order = await loadQuoteOrder(quote)
  if (order && isLiveQuoteOrder(order)) return jsonError(`La propuesta ya está aceptada (pedido ${order.number}) y no se puede modificar.`, 409)

  const catalog = await getCatalog()
  const built = buildProposal(body.data.proposal, { vatRate: catalog.vatRate, previous: quote.proposal })

  if (body.data.action === 'save') {
    const saved = await saveQuoteProposal(quote.id, built)
    if (!saved) return jsonError('No encontrado', 404)
    return Response.json({ ok: true, proposal: saved.proposal })
  }

  if (built.totalCents < 1) return jsonError('La propuesta debe tener un importe total mayor que cero para enviarla.', 400)
  const sent = await markQuoteProposalSent(quote.id, markProposalSent(built))
  if (!sent) return jsonError('No encontrado', 404)

  // El email se espera (y no se lanza): el panel muestra si salió, se simuló o falló.
  let email: 'sent' | 'simulated' | 'failed' = 'failed'
  let emailError: string | undefined
  try {
    const result = await sendQuoteProposal(sent)
    email = result.ok ? (result.simulated ? 'simulated' : 'sent') : 'failed'
    emailError = result.error
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err)
  }

  // El estado cambia a "Presupuesto enviado": la lista y el aviso de nuevos del menú deben reflejarlo.
  revalidatePath('/admin', 'layout')
  return Response.json({
    ok: true,
    proposal: sent.proposal,
    status: sent.status,
    publicUrl: absoluteUrl(proposalPagePath(sent)),
    email,
    ...(emailError ? { emailError } : {}),
  })
}
