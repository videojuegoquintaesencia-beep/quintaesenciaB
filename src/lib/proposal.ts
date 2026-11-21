/**
 * Propuesta de precio de un presupuesto (lo que la dueña compone en el panel y el cliente acepta y paga).
 *
 * Es código PURO (sin base de datos): lo comparten el editor del panel, la página pública y el servidor.
 * Todos los importes son céntimos de euro, IVA incluido. Los totales SIEMPRE los calcula el servidor
 * (`buildProposal`): la propuesta guardada ya lleva los totales, y el pedido se crea a partir de ella,
 * nunca a partir de importes que envíe el navegador.
 */
import { z } from 'zod'
import './zod-es'
import { PRODUCTS, type ProductId } from '@/config/products'
import { formatEUR, unidades } from './format'
import { newId } from './ids'
import { vatIncludedCents } from './pricing'

export const PROPOSAL_VERSION = 1
export const PROPOSAL_MAX_LINES = 30
export const PROPOSAL_DEFAULT_VALIDITY_DAYS = 15
export const PROPOSAL_MAX_VALIDITY_DAYS = 365

/** Línea sin producto del catálogo (texto libre: otro artículo, un servicio de diseño, etc.). */
export const OTHER_PRODUCT_ID = 'otro'
export type ProposalProductId = ProductId | typeof OTHER_PRODUCT_ID

const PRODUCT_IDS = PRODUCTS.map((p) => p.id) as [ProductId, ...ProductId[]]
export const PROPOSAL_PRODUCT_IDS = [...PRODUCT_IDS, OTHER_PRODUCT_ID] as [ProposalProductId, ...ProposalProductId[]]

const lineIdSchema = z.string().regex(/^[a-z0-9]{12,40}$/)
/** Unidades por talla (clave = id de talla del catálogo, o "unica" si no se desglosa). */
const sizesSchema = z.record(z.string().regex(/^[A-Za-z0-9]{1,12}$/, 'Talla no válida'), z.number().int().min(0).max(100_000))

const lineBase = z.object({
  lineId: lineIdSchema.optional(),
  productId: z.enum(PROPOSAL_PRODUCT_IDS, { error: 'Elige un producto' }),
  description: z.string().trim().min(1, 'Describe esta línea').max(300, 'Máximo 300 caracteres'),
  sizes: sizesSchema,
  /** Precio por unidad, IVA incluido. */
  unitCents: z.number().int().min(0, 'El precio no puede ser negativo').max(10_000_000, 'Precio demasiado alto'),
})

/** Comprobaciones comunes a la entrada del panel y a la propuesta guardada. */
function checkLine(line: z.infer<typeof lineBase>, ctx: z.RefinementCtx) {
  const quantity = totalUnits(line.sizes)
  if (quantity < 1) ctx.addIssue({ code: 'custom', path: ['sizes'], message: 'Indica al menos una unidad' })
  const product = PRODUCTS.find((p) => p.id === line.productId)
  const allowed = new Set([...(product?.sizes.map((s) => s.id) ?? []), 'unica'])
  for (const sizeId of Object.keys(line.sizes)) {
    if (!allowed.has(sizeId)) ctx.addIssue({ code: 'custom', path: ['sizes'], message: `Talla no válida: ${sizeId}` })
  }
}

export const proposalLineInputSchema = lineBase.superRefine(checkLine)

export const proposalInputSchema = z.object({
  lines: z
    .array(proposalLineInputSchema)
    .min(1, 'Añade al menos una línea')
    .max(PROPOSAL_MAX_LINES, `Máximo ${PROPOSAL_MAX_LINES} líneas`),
  shippingCents: z.number().int().min(0, 'El envío no puede ser negativo').max(100_000, 'Envío demasiado alto'),
  validityDays: z.number().int().min(1, 'Mínimo 1 día').max(PROPOSAL_MAX_VALIDITY_DAYS, `Máximo ${PROPOSAL_MAX_VALIDITY_DAYS} días`),
  /** Texto que ve el cliente en el email y en la página de la propuesta. */
  message: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
})
export type ProposalInput = z.infer<typeof proposalInputSchema>
export type ProposalLineInput = z.infer<typeof proposalLineInputSchema>

export const proposalLineSchema = lineBase
  .extend({
    lineId: lineIdSchema,
    quantity: z.number().int().min(1),
    totalCents: z.number().int().min(0),
  })
  .superRefine(checkLine)
export type ProposalLine = z.infer<typeof proposalLineSchema>

/** Propuesta tal y como se guarda en `quotes.proposal_json`. */
export const proposalSchema = z.object({
  v: z.literal(PROPOSAL_VERSION),
  lines: z.array(proposalLineSchema).min(1).max(PROPOSAL_MAX_LINES),
  shippingCents: z.number().int().min(0),
  validityDays: z.number().int().min(1).max(PROPOSAL_MAX_VALIDITY_DAYS),
  message: z.string().max(2000),
  subtotalCents: z.number().int().min(0),
  totalCents: z.number().int().min(0),
  /** IVA contenido en el total. */
  vatCents: z.number().int().min(0),
  /** Fecha límite para aceptar (ISO). Se fija al enviar y se renueva al reenviar; null mientras es borrador. */
  validUntil: z.string().nullable(),
  /** Último envío al cliente (ISO); null si nunca se ha enviado. */
  sentAt: z.string().nullable(),
  /** Momento en que el cliente aceptó (creó el pedido); desde entonces la propuesta no se puede editar. */
  acceptedAt: z.string().nullable(),
  updatedAt: z.string(),
})
export type Proposal = z.infer<typeof proposalSchema>

/* ───────────── Cálculo ───────────── */

export function totalUnits(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((n, q) => n + (Number.isFinite(q) ? q : 0), 0)
}

/**
 * Construye la propuesta con los totales calculados aquí (nunca se aceptan del navegador). Conserva lo que no se
 * edita (envío, validez y aceptación) de la versión anterior, si la hay.
 */
export function buildProposal(input: ProposalInput, opts: { vatRate: number; previous?: Proposal | null; now?: Date }): Proposal {
  const lines: ProposalLine[] = input.lines.map((line) => {
    const sizes = Object.fromEntries(Object.entries(line.sizes).filter(([, q]) => q > 0))
    const quantity = totalUnits(sizes)
    return {
      lineId: line.lineId ?? newId(12),
      productId: line.productId,
      description: line.description,
      sizes,
      unitCents: line.unitCents,
      quantity,
      totalCents: quantity * line.unitCents,
    }
  })
  const subtotalCents = lines.reduce((n, l) => n + l.totalCents, 0)
  const totalCents = subtotalCents + input.shippingCents
  const prev = opts.previous ?? null
  return {
    v: PROPOSAL_VERSION,
    lines,
    shippingCents: input.shippingCents,
    validityDays: input.validityDays,
    message: input.message,
    subtotalCents,
    totalCents,
    vatCents: vatIncludedCents(totalCents, opts.vatRate),
    validUntil: prev?.validUntil ?? null,
    sentAt: prev?.sentAt ?? null,
    acceptedAt: prev?.acceptedAt ?? null,
    updatedAt: (opts.now ?? new Date()).toISOString(),
  }
}

/** Fecha límite de aceptación: `validityDays` días desde el envío, hasta el final de ese día (hora de España). */
export function validUntilFrom(sentAt: Date, validityDays: number): string {
  const end = new Date(sentAt.getTime() + validityDays * 86_400_000)
  // Último instante del día en Europe/Madrid: así "válida hasta el 5" incluye todo el día 5.
  const madridDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(end) // AAAA-MM-DD
  const endOfDayAsUtc = new Date(`${madridDay}T23:59:59Z`)
  const offsetMinutes = madridOffsetMinutes(endOfDayAsUtc)
  return new Date(endOfDayAsUtc.getTime() - offsetMinutes * 60_000).toISOString()
}

/** Desfase de Europe/Madrid respecto a UTC (en minutos) en un instante dado: +60 en invierno, +120 en verano. */
function madridOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // Con segundos: sin ellos, a las 23:59:59 el desfase salía con un minuto de menos y la validez terminaba a las
    // 00:00:59 del día siguiente, así que la fecha que veía el cliente era un día posterior a la real.
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((local - at.getTime()) / 60_000)
}

/** Marca la propuesta como enviada ahora: fija (o renueva) la fecha límite de aceptación. */
export function markProposalSent(proposal: Proposal, now = new Date()): Proposal {
  return { ...proposal, sentAt: now.toISOString(), validUntil: validUntilFrom(now, proposal.validityDays), updatedAt: now.toISOString() }
}

export function isProposalExpired(proposal: Pick<Proposal, 'validUntil'>, now = Date.now()): boolean {
  if (!proposal.validUntil) return false
  const limit = new Date(proposal.validUntil).getTime()
  return Number.isFinite(limit) && limit < now
}

/* ───────────── Presentación ───────────── */

const longDate = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' })

/** "2026-12-05T22:59:59.000Z" → "5 de diciembre de 2026" (día de España peninsular). */
export function formatValidUntil(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : longDate.format(d)
}

/** Nombre del producto del catálogo de una línea ("Camiseta") o "Otro producto". */
export function proposalProductName(productId: ProposalProductId): string {
  return PRODUCTS.find((p) => p.id === productId)?.name ?? 'Otro producto'
}

/** "2 × M, 1 × L" (vacío si no hay desglose por tallas). */
export function proposalSizesLabel(sizes: Record<string, number>): string {
  return Object.entries(sizes)
    .filter(([size, q]) => q > 0 && size !== 'unica')
    .map(([size, q]) => `${q} × ${size}`)
    .join(', ')
}

/** Detalle de una línea bajo su descripción: producto del catálogo, unidades (con tallas) y precio por unidad. */
export function proposalLineDetail(line: Pick<ProposalLine, 'productId' | 'sizes' | 'quantity' | 'unitCents'>): string {
  const parts: string[] = []
  if (line.productId !== OTHER_PRODUCT_ID) parts.push(proposalProductName(line.productId))
  const sizes = proposalSizesLabel(line.sizes)
  parts.push(sizes ? `${unidades(line.quantity)} (${sizes})` : unidades(line.quantity))
  parts.push(`${formatEUR(line.unitCents)} por unidad`)
  return parts.join(' · ')
}

/** "12,50" / "12.50" / "12" → 1250. Null si no es un importe en euros con como máximo dos decimales. */
export function parseEurosToCents(value: string): number | null {
  const text = value.trim().replace(/\s|€/g, '')
  if (text === '') return null
  const m = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(text)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0)
}

/** 1250 → "12,50" (para rellenar campos de importe). */
export function centsToEurosInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
