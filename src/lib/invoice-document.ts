/**
 * Modelo de la factura y cálculo de sus importes. Es código PURO (sin base de datos): lo usa `lib/invoices.ts`
 * para emitir y los componentes que la pintan en pantalla y en papel.
 *
 * La factura es una COPIA INMUTABLE de lo facturado: una vez emitida, cambiar los datos del titular o del pedido
 * no la altera (se guarda entera en `orders.invoice_json`).
 *
 * Método de cálculo del IVA. Los precios de la tienda llevan el IVA incluido, así que la base de cada línea se
 * obtiene dividiendo su importe entre 1,21 y redondeando al céntimo; la cuota de la línea es la DIFERENCIA entre
 * el importe y la base. Así, en cada línea, base + cuota = importe exacto, y los totales de la factura son la
 * suma de las líneas: base imponible + cuota de IVA = total del pedido, sin descuadres de redondeo. (El importe de
 * IVA que el pedido enseña en la web se calcula sobre el total y puede diferir de la suma por línea en uno o dos
 * céntimos: el documento fiscal es la factura.)
 */
import { site } from '@/config/site'
import { formatEUR } from './format'
import type { OrderStatus } from './order-status'
import type { Order, OrderItem } from './orders'
import type { Settings } from './settings-schema'

export type InvoiceKind = 'invoice' | 'rectification'

export interface InvoiceParty {
  /** Razón social (si hay empresa) o nombre y apellidos. */
  name: string
  /** Persona de contacto cuando el destinatario es una empresa. */
  attention: string | null
  taxId: string | null
  addressLines: string[]
}

export interface InvoiceIssuer extends InvoiceParty {
  /** Datos registrales (obligatorios si el titular es una sociedad). */
  registry: string | null
  email: string
  phone: string
}

export interface InvoiceLine {
  description: string
  /** Tallas, zonas de estampado, descuento aplicado… (una línea de texto). */
  detail: string | null
  units: number
  /** Precio medio por unidad sin IVA, en céntimos (puede tener decimales). */
  unitNetCents: number
  /** Base imponible de la línea (céntimos). */
  netCents: number
  vatRate: number
  /** Cuota de IVA de la línea (céntimos). */
  vatCents: number
  /** Importe de la línea con IVA (céntimos). */
  grossCents: number
}

export interface InvoiceTotals {
  netCents: number
  vatCents: number
  grossCents: number
}

export interface InvoiceDocument {
  kind: InvoiceKind
  /** Número con serie y año: "F-2026-0001" (facturas) o "R-2026-0001" (rectificativas). */
  number: string
  issuedAt: string
  issuer: InvoiceIssuer
  recipient: InvoiceParty
  lines: InvoiceLine[]
  totals: InvoiceTotals
  vatRate: number
  payment: {
    method: string
    /** Pago simulado en modo demostración: la factura no tiene validez. */
    demo: boolean
    paidAt: string | null
    reference: string | null
  }
  order: { id: string; number: string; createdAt: string }
  /** Solo en rectificativas: factura que anula y motivo. */
  rectifies: { number: string; issuedAt: string; reason: string } | null
}

/** Lo que se guarda en `orders.invoice_json`. */
export interface InvoiceRecord {
  v: 1
  invoice: InvoiceDocument
  rectification: InvoiceDocument | null
}

/* ───────────── Estados ───────────── */

/** Pedidos cobrados: a partir de aquí se puede emitir la factura. */
export const INVOICEABLE_STATUSES: readonly OrderStatus[] = ['paid', 'in_production', 'ready', 'shipped', 'delivered']

/** Pedidos con el dinero devuelto: si tenían factura, se anula con una rectificativa. */
export const RECTIFIABLE_STATUSES: readonly OrderStatus[] = ['refunded', 'cancelled']

/* ───────────── Numeración ───────────── */

/** Año fiscal de la fecha de emisión, en la hora de España (la serie se reinicia cada año). */
export function invoiceYear(issuedAt: string | Date): string {
  const d = typeof issuedAt === 'string' ? new Date(issuedAt) : issuedAt
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric' }).format(d)
}

/** Clave del contador en la tabla `counters` ("invoice:2026" / "rectification:2026"). */
export function invoiceCounterKey(kind: InvoiceKind, year: string): string {
  return `${kind}:${year}`
}

/** "F-2026-0001" / "R-2026-0001" (el correlativo crece sin tope: a partir de 9999 tiene cinco cifras). */
export function formatInvoiceNumber(kind: InvoiceKind, year: string, n: number): string {
  return `${kind === 'invoice' ? 'F' : 'R'}-${year}-${String(n).padStart(4, '0')}`
}

/* ───────────── Importes ───────────── */

/** Base y cuota de un importe con IVA incluido; cumple siempre base + cuota = importe. */
export function splitVat(grossCents: number, vatRate: number): { netCents: number; vatCents: number } {
  const netCents = Math.round(grossCents / (1 + vatRate))
  return { netCents, vatCents: grossCents - netCents }
}

function line(description: string, detail: string | null, units: number, grossCents: number, vatRate: number): InvoiceLine {
  const { netCents, vatCents } = splitVat(grossCents, vatRate)
  return {
    description,
    detail,
    units,
    unitNetCents: units === 0 ? 0 : Math.round((netCents / units) * 100) / 100,
    netCents,
    vatRate,
    vatCents,
    grossCents,
  }
}

/** "2 × M, 1 × L" (vacío en productos de talla única). */
function sizesText(item: OrderItem): string {
  return Object.entries(item.sizes)
    .filter(([size, q]) => q > 0 && size !== 'unica')
    .map(([size, q]) => `${q} × ${size}`)
    .join(', ')
}

function itemDetail(item: OrderItem): string | null {
  const parts = [
    sizesText(item),
    item.prints.length ? `Estampado: ${item.prints.map((p) => p.label.toLowerCase()).join(', ')}` : '',
    item.sizeSurchargeCents > 0 ? `Suplemento de talla: ${formatEUR(item.sizeSurchargeCents)} (IVA incl.)` : '',
    item.discountCents > 0 ? `Descuento por cantidad ${item.discountPct} %: −${formatEUR(item.discountCents)} (IVA incl.)` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export function buildInvoiceLines(order: Order, vatRate: number): InvoiceLine[] {
  const lines = order.items.map((item) =>
    line(`${item.productName} · ${item.colorName}`, itemDetail(item), item.quantity, item.totalCents, vatRate),
  )
  if (order.shippingCents > 0) lines.push(line('Gastos de envío', null, 1, order.shippingCents, vatRate))
  return lines
}

export function sumLines(lines: InvoiceLine[]): InvoiceTotals {
  return lines.reduce(
    (t, l) => ({ netCents: t.netCents + l.netCents, vatCents: t.vatCents + l.vatCents, grossCents: t.grossCents + l.grossCents }),
    { netCents: 0, vatCents: 0, grossCents: 0 },
  )
}

/* ───────────── Partes ───────────── */

function recipientFrom(order: Order): InvoiceParty {
  const a = order.shipping
  return {
    name: order.company || order.customerName,
    attention: order.company && order.company !== order.customerName ? order.customerName : null,
    taxId: order.taxId,
    addressLines: [a.line1, a.line2 ?? '', `${a.postalCode} ${a.city} (${a.province})`, 'España'].filter(Boolean),
  }
}

function issuerFrom(settings: Settings): InvoiceIssuer {
  const { business, contact } = settings
  return {
    name: business.legalName,
    attention: null,
    taxId: business.taxId,
    // Sin domicilio en los ajustes no se pinta una línea vacía (el dato es obligatorio: ver «Antes de publicar»).
    addressLines: [business.registeredAddress].filter(Boolean),
    registry: business.registry || null,
    email: contact.email,
    phone: contact.phone,
  }
}

function paymentFrom(order: Order): InvoiceDocument['payment'] {
  const demo = order.payment.provider === 'demo'
  return {
    method: demo ? 'Pago de demostración (simulado)' : 'PayPal',
    demo,
    paidAt: order.payment.paidAt,
    reference: demo ? null : (order.payment.paypalCaptureId ?? order.payment.paypalOrderId),
  }
}

/* ───────────── Documentos ───────────── */

export function buildInvoiceDocument(input: { order: Order; settings: Settings; number: string; issuedAt: string }): InvoiceDocument {
  const vatRate = site.vatRate
  const lines = buildInvoiceLines(input.order, vatRate)
  return {
    kind: 'invoice',
    number: input.number,
    issuedAt: input.issuedAt,
    issuer: issuerFrom(input.settings),
    recipient: recipientFrom(input.order),
    lines,
    totals: sumLines(lines),
    vatRate,
    payment: paymentFrom(input.order),
    order: { id: input.order.id, number: input.order.number, createdAt: input.order.createdAt },
    rectifies: null,
  }
}

/**
 * Factura rectificativa por anulación total: las mismas líneas de la original en NEGATIVO, con referencia a la
 * factura que rectifica. El emisor y el destinatario se copian de la original (son los de aquel momento).
 */
export function buildRectification(input: { original: InvoiceDocument; number: string; issuedAt: string; reason: string }): InvoiceDocument {
  const negate = (l: InvoiceLine): InvoiceLine => ({
    ...l,
    units: -l.units,
    netCents: -l.netCents,
    vatCents: -l.vatCents,
    grossCents: -l.grossCents,
  })
  const lines = input.original.lines.map(negate)
  return {
    ...input.original,
    kind: 'rectification',
    number: input.number,
    issuedAt: input.issuedAt,
    lines,
    totals: sumLines(lines),
    rectifies: { number: input.original.number, issuedAt: input.original.issuedAt, reason: input.reason },
  }
}

/** Lee lo guardado en `invoice_json`; `null` si está vacío o no tiene la forma esperada. */
export function parseInvoiceRecord(json: string | null | undefined): InvoiceRecord | null {
  if (!json) return null
  try {
    const value = JSON.parse(json) as Partial<InvoiceRecord> | null
    if (!value || value.v !== 1 || !value.invoice || typeof value.invoice.number !== 'string') return null
    return { v: 1, invoice: value.invoice, rectification: value.rectification ?? null }
  } catch {
    return null
  }
}

/** Motivo que figura en la rectificativa según cómo acabó el pedido. */
export function rectificationReason(status: OrderStatus): string {
  return status === 'cancelled'
    ? 'Anulación de la factura por cancelación del pedido y devolución del importe.'
    : 'Anulación de la factura por reembolso íntegro del pedido.'
}
