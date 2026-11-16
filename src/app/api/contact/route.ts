import { createContactMessage } from '@/lib/quotes'
import { contactMessageSchema } from '@/lib/validators'
import { handleIntake } from '../quotes/intake'

export const runtime = 'nodejs'

/**
 * POST /api/contact  (JSON, esquema `contactMessageSchema`)
 * → 200 { ok: true, number: "MS-1001" } | 400 { ok: false, error, errors } | 429 { ok: false, error }
 * Máximo 5 mensajes por hora y por IP.
 */
export async function POST(req: Request) {
  return handleIntake(req, {
    kind: 'contact',
    schema: contactMessageSchema,
    create: createContactMessage,
    perHour: 5,
  })
}
