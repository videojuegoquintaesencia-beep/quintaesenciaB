/**
 * Recepción común de formularios públicos (presupuestos y contacto):
 * límite de envíos por IP, campo trampa anti-bots, validación con zod, guardado y avisos por email.
 */
import { after } from 'next/server'
import type { ZodType } from 'zod'
import { writeToUs } from '@/lib/contact-text'
import { sendQuoteAdminAlert, sendQuoteReceived } from '@/lib/emails/quote'
import type { Quote, QuoteKind } from '@/lib/quotes'
import { readBodyJson } from '@/lib/http-body'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'
import { fieldErrors, firstZodError } from '@/lib/validators'

const MAX_BODY_BYTES = 32 * 1024
const MAX_ACKS_PER_RECIPIENT_PER_DAY = 3
/** Envíos por hora entre TODAS las IP (por tipo de formulario): una red de seguridad que no depende de la IP. */
const MAX_INTAKES_PER_HOUR_ALL_IPS = 100
const NUMBER_PREFIX: Record<QuoteKind, string> = { quote: 'PR', contact: 'MS' }

type Failure = { ok: false; error: string; errors?: Record<string, string> }
const fail = (status: number, body: Failure, headers?: HeadersInit) => Response.json(body, { status, headers })

/** Lee el JSON con tope real de bytes (también sin Content-Length). */
async function readBody(req: Request): Promise<{ body: Record<string, unknown> | null; tooLarge: boolean }> {
  const res = await readBodyJson(req, MAX_BODY_BYTES)
  if (!res.ok) return { body: null, tooLarge: res.status === 413 }
  const json = res.value
  return {
    body: json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null,
    tooLarge: false,
  }
}

export async function handleIntake<T>(
  req: Request,
  opts: {
    kind: QuoteKind
    schema: ZodType<T>
    create: (data: T) => Promise<Quote>
    /** Comprobaciones que dependen de la base de datos; devuelve errores por campo si algo no es válido. */
    verify?: (data: T) => Promise<Record<string, string> | null>
    /** Envíos permitidos por IP y hora. */
    perHour: number
  },
): Promise<Response> {
  // Los mensajes de error remiten al email de contacto efectivo (ajustes del panel).
  const alternative = async () => writeToUs((await getSettings()).contact.email)

  const limit = rateLimit(`intake:${opts.kind}:${clientIp(req)}`, opts.perHour, 60 * 60_000)
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSec / 60))
    return fail(
      429,
      {
        ok: false,
        error: `Has enviado varios formularios seguidos. Inténtalo de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} o ${await alternative()}.`,
      },
      { 'Retry-After': String(limit.retryAfterSec) },
    )
  }

  // Tope global: si TRUSTED_PROXY_HOPS estuviera mal definido, cambiar de "IP" no permite inundar la bandeja de avisos.
  const allIps = rateLimit(`intake:${opts.kind}:all`, MAX_INTAKES_PER_HOUR_ALL_IPS, 60 * 60_000)
  if (!allIps.ok) {
    return fail(
      429,
      { ok: false, error: `Estamos recibiendo muchos envíos a la vez. Inténtalo de nuevo en un rato o ${await alternative()}.` },
      { 'Retry-After': String(allIps.retryAfterSec) },
    )
  }

  const { body, tooLarge } = await readBody(req)
  if (tooLarge) return fail(413, { ok: false, error: 'El mensaje es demasiado grande.' })
  if (!body) return fail(400, { ok: false, error: 'Petición no válida.' })

  // Campo trampa: las personas no lo ven, los bots lo rellenan. Se responde "bien" sin guardar nada.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return Response.json({ ok: true, number: `${NUMBER_PREFIX[opts.kind]}-${1000 + Math.floor(Math.random() * 9000)}` })
  }

  const parsed = opts.schema.safeParse(body)
  if (!parsed.success) {
    return fail(400, { ok: false, error: firstZodError(parsed.error), errors: fieldErrors(parsed.error) })
  }

  const problems = await opts.verify?.(parsed.data)
  if (problems) return fail(400, { ok: false, error: Object.values(problems)[0], errors: problems })

  let quote: Quote
  try {
    quote = await opts.create(parsed.data)
  } catch (err) {
    console.error('[intake] No se pudo guardar:', err instanceof Error ? err.message : err)
    return fail(500, { ok: false, error: `No hemos podido guardar tu envío. Inténtalo de nuevo o ${await alternative()}.` })
  }

  // Los emails se envían tras responder y nunca hacen fallar la petición.
  // El acuse de recibo sale con el dominio de la tienda hacia cualquier dirección que se escriba en el formulario:
  // se limita por destinatario (3 al día) para que no sirva de relé de correo no deseado hacia terceros.
  const ackAllowed = rateLimit(`ack:${quote.email}`, MAX_ACKS_PER_RECIPIENT_PER_DAY, 24 * 60 * 60_000).ok
  after(async () => {
    await Promise.allSettled([ackAllowed ? sendQuoteReceived(quote) : Promise.resolve(), sendQuoteAdminAlert(quote)])
  })

  return Response.json({ ok: true, number: quote.number })
}
