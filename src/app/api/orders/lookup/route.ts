import { z } from 'zod'
import '@/lib/zod-es'
import { readJsonBody } from '@/lib/checkout'
import { findOrderByNumberAndEmail } from '@/lib/orders'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { emailSchema } from '@/lib/validators'

export const runtime = 'nodejs'

const lookupSchema = z.object({
  number: z.string().trim().min(1).max(30),
  email: emailSchema,
})

const NOT_FOUND = 'No hemos encontrado ningún pedido con esos datos. Revisa el número de pedido y el email que usaste al comprar.'

/** POST /api/orders/lookup { number, email } → { url }. Mensaje genérico: no revela si un pedido existe. */
export async function POST(req: Request) {
  const limit = rateLimit(`lookup:${clientIp(req)}`, 10, 10 * 60_000)
  if (!limit.ok) {
    return Response.json(
      { error: 'Has hecho demasiadas consultas seguidas. Espera unos minutos e inténtalo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  const parsed = lookupSchema.safeParse(await readJsonBody(req, 2048))
  if (!parsed.success) return Response.json({ error: NOT_FOUND }, { status: 404 })

  const order = await findOrderByNumberAndEmail(parsed.data.number, parsed.data.email)
  if (!order) return Response.json({ error: NOT_FOUND }, { status: 404 })
  return Response.json({ url: `/pedido/${order.id}?t=${order.publicToken}` })
}
