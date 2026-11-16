import { getFileMetas } from '@/lib/files'
import { createQuote } from '@/lib/quotes'
import { quoteFormSchema } from '@/lib/quote-form'
import { handleIntake } from './intake'

export const runtime = 'nodejs'

/**
 * POST /api/quotes  (JSON, esquema `quoteFormSchema`)
 * → 200 { ok: true, number: "PR-1001" } | 400 { ok: false, error, errors } | 429 { ok: false, error }
 * Máximo 5 solicitudes por hora y por IP. Los archivos adjuntos deben ser subidas "quote" aún sin asignar.
 */
export async function POST(req: Request) {
  return handleIntake(req, {
    kind: 'quote',
    schema: quoteFormSchema,
    create: (data) => createQuote({ ...data, fileIds: [...new Set(data.fileIds)] }),
    perHour: 5,
    verify: async ({ fileIds }) => {
      if (fileIds.length === 0) return null
      const metas = await getFileMetas(fileIds)
      const usable = metas.filter((m) => m.kind === 'quote' && !m.quoteId && !m.orderId)
      return usable.length === new Set(fileIds).size
        ? null
        : { fileIds: 'Alguno de los archivos adjuntos ya no está disponible. Quítalo y vuelve a subirlo.' }
    },
  })
}
