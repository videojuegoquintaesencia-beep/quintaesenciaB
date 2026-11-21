/**
 * Emails de presupuestos y mensajes de contacto: acuse de recibo al cliente y aviso interno a la tienda.
 * Cada texto va en HTML (tablas y estilos en línea) y en texto plano. Todo lo que escribe el cliente se escapa.
 */
import 'server-only'
import { site } from '@/config/site'
import { absoluteUrl, adminNotifyAddress, emailShell, escapeHtml as esc, sendMail, type MailResult } from '../email'
import { formatEUR } from '../format'
import { getSettings } from '../settings'
import { ENTITY_WORD } from './names'
import { formatValidUntil, proposalLineDetail, type Proposal } from '../proposal'
import { QUOTE_PRODUCT_LABELS, type QuoteProduct } from '../quote-form'
import type { Quote } from '../quotes'

const MUTED = '#4a4270'
const LINE = '#e9e3f5'

/**
 * Nombre de pila para el saludo. Solo se usa si parece un nombre (letras, apóstrofo o guion) y no el de una entidad:
 * el formulario es público y este email sale con el dominio de la tienda, así que no se reproduce texto libre.
 */
const firstName = (quote: Quote) => {
  const first = quote.name.trim().split(/\s+/)[0] ?? ''
  return /^[\p{L}][\p{L}'’-]{0,29}$/u.test(first) && !ENTITY_WORD.test(first) ? first : ''
}
const greeting = (quote: Quote) => {
  const name = firstName(quote)
  return name ? `Hola ${name}` : 'Hola'
}

const productLabel = (id: string) => (id === 'otro' ? 'otros productos' : (QUOTE_PRODUCT_LABELS[id as QuoteProduct]?.toLowerCase() ?? id))
const productsText = (quote: Quote) => quote.products.map(productLabel).join(', ')

/** "2026-12-01" → "1 de diciembre de 2026" (sin depender de la zona horaria del servidor). */
function deadlineText(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' }).format(d)
}

function fileUrl(id: string): string {
  return absoluteUrl(`/api/files/${id}?download=1`)
}

type Row = readonly [label: string, value: string]

/** Datos de la solicitud (las filas sin valor se omiten). */
function quoteRows(quote: Quote): Row[] {
  const rows: (Row | null)[] = [['Referencia', quote.number]]
  if (quote.kind === 'quote') {
    rows.push(
      quote.products.length ? ['Productos', productsText(quote)] : null,
      quote.quantity ? ['Unidades aproximadas', String(quote.quantity)] : null,
      quote.deadline ? ['Fecha deseada', deadlineText(quote.deadline)] : null,
      quote.fileIds.length ? ['Archivos adjuntos', String(quote.fileIds.length)] : null,
    )
  }
  return rows.filter((r): r is Row => r !== null)
}

function rowsHtml(rows: Row[]): string {
  const body = rows
    .map(
      ([label, value], i) =>
        `<tr><td style="padding:8px 12px 8px 0;color:${MUTED};font-size:14px;white-space:nowrap;vertical-align:top;${i ? `border-top:1px solid ${LINE};` : ''}">${esc(label)}</td><td style="padding:8px 0;font-weight:700;${i ? `border-top:1px solid ${LINE};` : ''}">${esc(value)}</td></tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:2px solid #1b1340;border-radius:14px;padding:6px 16px;background:#fffaf0"><tbody>${body}</tbody></table>`
}

const rowsText = (rows: Row[]) => rows.map(([l, v]) => `${l}: ${v}`).join('\n')

/** Acuse de recibo al cliente. */
export async function sendQuoteReceived(quote: Quote): Promise<MailResult> {
  const isQuote = quote.kind === 'quote'
  const rows = quoteRows(quote)
  const what = isQuote ? 'solicitud de presupuesto' : 'mensaje'
  const next = isQuote
    ? 'Revisaremos lo que nos cuentas y te escribiremos con una propuesta o con las preguntas que necesitemos para afinar el presupuesto.'
    : 'Lo leeremos con calma y te contestaremos a este mismo email.'
  const cta = isQuote
    ? { label: 'Prepara tu diseño', url: absoluteUrl('/como-funciona#prepara-tu-diseno') }
    : { label: 'Ver preguntas frecuentes', url: absoluteUrl('/preguntas-frecuentes') }
  // Email de contacto efectivo (ajustes del panel): firma del texto plano y dirección de respuesta.
  const { contact } = await getSettings()

  return sendMail({
    to: quote.email,
    subject: isQuote ? `Hemos recibido tu solicitud de presupuesto (${quote.number})` : `Hemos recibido tu mensaje (${quote.number})`,
    html: await emailShell({
      title: isQuote ? '¡Solicitud recibida!' : '¡Mensaje recibido!',
      preheader: 'Te respondemos en 1-2 días laborables.',
      bodyHtml: `<p style="margin:0 0 12px">${esc(greeting(quote))}, gracias por escribirnos. Hemos recibido tu ${what} y te responderemos en <strong>1-2 días laborables</strong>.</p>
        <p style="margin:0 0 4px">${next}</p>
        ${rowsHtml(rows)}
        <p style="margin:0">¿Quieres añadir algo? Responde a este email y lo sumamos a tu ${isQuote ? 'solicitud' : 'mensaje'}.</p>`,
      ctaLabel: cta.label,
      ctaUrl: cta.url,
    }),
    text: [
      `${greeting(quote)}, gracias por escribirnos.`,
      '',
      `Hemos recibido tu ${what} y te responderemos en 1-2 días laborables. ${next}`,
      '',
      rowsText(rows),
      '',
      `¿Quieres añadir algo? Responde a este email y lo sumamos a tu ${isQuote ? 'solicitud' : 'mensaje'}.`,
      '',
      [site.name, contact.email].filter(Boolean).join(' · '),
    ].join('\n'),
    replyTo: contact.email || undefined,
  })
}

/* ───────────── Propuesta de precio ───────────── */

/** Ruta pública de la propuesta (incluye el token secreto). */
export function proposalPagePath(quote: Pick<Quote, 'id' | 'publicToken'>): string {
  return `/presupuesto/${quote.id}?t=${quote.publicToken ?? ''}`
}

function proposalLinesHtml(proposal: Proposal): string {
  const rows = proposal.lines
    .map(
      (line) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};vertical-align:top"><strong>${esc(line.description)}</strong><br>
          <span style="font-size:14px;color:${MUTED}">${esc(proposalLineDetail(line))}</span></td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${LINE};text-align:right;white-space:nowrap;vertical-align:top;font-weight:700">${esc(formatEUR(line.totalCents))}</td>
      </tr>`,
    )
    .join('')
  const total = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;${strong ? 'font-weight:800;font-size:17px;' : `color:${MUTED};`}">${esc(label)}</td><td style="padding:4px 0;text-align:right;${strong ? 'font-weight:800;font-size:17px;' : ''}">${esc(value)}</td></tr>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0">${rows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0">
      ${total('Subtotal', formatEUR(proposal.subtotalCents))}
      ${total('Envío', proposal.shippingCents === 0 ? 'Incluido' : formatEUR(proposal.shippingCents))}
      ${total('Total', formatEUR(proposal.totalCents), true)}
      ${total(`IVA incluido (${Math.round(site.vatRate * 100)} %)`, formatEUR(proposal.vatCents))}
    </table>`
}

function proposalLinesText(proposal: Proposal): string {
  return [
    ...proposal.lines.map((line) => `- ${line.description} · ${proposalLineDetail(line)} · ${formatEUR(line.totalCents)}`),
    '',
    `Subtotal: ${formatEUR(proposal.subtotalCents)}`,
    `Envío: ${proposal.shippingCents === 0 ? 'Incluido' : formatEUR(proposal.shippingCents)}`,
    `Total: ${formatEUR(proposal.totalCents)} (IVA incluido: ${formatEUR(proposal.vatCents)})`,
  ].join('\n')
}

/**
 * Propuesta de precio para el cliente, con el enlace para verla, aceptarla y pagarla. Requiere que el presupuesto
 * tenga propuesta enviada y token público (los fija `markQuoteProposalSent`).
 */
export async function sendQuoteProposal(quote: Quote): Promise<MailResult> {
  const proposal = quote.proposal
  if (!proposal || !quote.publicToken) return { ok: false, error: 'El presupuesto no tiene propuesta enviada' }
  const url = absoluteUrl(proposalPagePath(quote))
  const until = proposal.validUntil ? formatValidUntil(proposal.validUntil) : ''
  const validity = until ? `Puedes aceptarla hasta el ${until}.` : ''
  const message = proposal.message.trim()

  return sendMail({
    to: quote.email,
    subject: `Tu presupuesto ${quote.number} — ${site.name}`,
    html: await emailShell({
      title: `Tu presupuesto ${quote.number}`,
      preheader: `Propuesta de ${formatEUR(proposal.totalCents)}, IVA incluido. ${validity}`.trim(),
      bodyHtml: `<p style="margin:0 0 12px">${esc(greeting(quote))}, ya tenemos lista la propuesta para tu solicitud <strong>${esc(quote.number)}</strong>.</p>
        ${message ? `<p style="margin:0 0 14px;background:#fff8ec;border-left:4px solid #ffc93c;border-radius:8px;padding:12px 14px;white-space:pre-wrap">${esc(message)}</p>` : ''}
        ${proposalLinesHtml(proposal)}
        <p style="margin:18px 0 0">${esc(validity)} Para aceptarla, abre el enlace, revisa los datos de envío y paga de forma segura. En cuanto recibamos el pago nos ponemos con tu pedido.</p>
        <p style="margin:12px 0 0;font-size:14px;color:${MUTED}">Si quieres cambiar algo, responde a este email y ajustamos la propuesta.</p>`,
      ctaLabel: 'Ver y aceptar la propuesta',
      ctaUrl: url,
    }),
    text: [
      `${greeting(quote)}, ya tenemos lista la propuesta para tu solicitud ${quote.number}.`,
      message ? `\n${message}\n` : '',
      proposalLinesText(proposal),
      '',
      `${validity} Para aceptarla, abre el enlace, revisa los datos de envío y paga de forma segura. En cuanto recibamos el pago nos ponemos con tu pedido.`,
      '',
      `Ver y aceptar la propuesta: ${url}`,
      '',
      'Si quieres cambiar algo, responde a este email y ajustamos la propuesta.',
      '',
      `${site.name} · ${site.contact.email}`,
    ]
      .filter((l) => l !== '')
      .join('\n'),
    replyTo: site.contact.email || undefined,
  })
}

/** Aviso interno al negocio. */
export async function sendQuoteAdminAlert(quote: Quote): Promise<MailResult> {
  const to = await adminNotifyAddress()
  if (!to) return { ok: false, error: 'Sin destinatario de avisos' }
  const isQuote = quote.kind === 'quote'
  const adminUrl = absoluteUrl(`/admin/presupuestos/${quote.id}`)

  const who: Row[] = [
    ['Nombre', quote.name],
    ...(quote.company ? ([['Empresa', quote.company]] as Row[]) : []),
    ['Email', quote.email],
    ...(quote.phone ? ([['Teléfono', quote.phone]] as Row[]) : []),
  ]
  const rows = [...quoteRows(quote), ...who]
  const files = quote.fileIds.map((id) => fileUrl(id))

  const headline = isQuote
    ? `${quote.name}${quote.company ? ` (${quote.company})` : ''}${quote.quantity ? ` · ${quote.quantity} uds` : ''}`
    : quote.name

  return sendMail({
    to,
    subject: `${isQuote ? 'Nuevo presupuesto' : 'Nuevo mensaje'} ${quote.number} — ${headline}`,
    html: await emailShell({
      title: `${isQuote ? 'Nueva solicitud de presupuesto' : 'Nuevo mensaje de contacto'} ${quote.number}`,
      preheader: quote.message.slice(0, 90),
      bodyHtml: `${rowsHtml(rows)}
        <p style="margin:0 0 6px;font-size:14px;color:${MUTED}">Mensaje</p>
        <p style="margin:0 0 14px;background:#fff8ec;border-left:4px solid #ffc93c;border-radius:8px;padding:12px 14px;white-space:pre-wrap">${esc(quote.message)}</p>
        ${
          files.length
            ? `<p style="margin:0 0 6px;font-size:14px;color:${MUTED}">Archivos adjuntos</p><ul style="margin:0 0 14px;padding-left:20px">${files
                .map((url, i) => `<li><a href="${esc(url)}" style="color:#5a3fe0;font-weight:700">Archivo ${i + 1}</a></li>`)
                .join('')}</ul>`
            : ''
        }
        <p style="margin:0;font-size:14px;color:${MUTED}">Responde a este email para escribir directamente al cliente.</p>`,
      ctaLabel: 'Abrir en el panel',
      ctaUrl: adminUrl,
    }),
    text: [
      `${isQuote ? 'Nueva solicitud de presupuesto' : 'Nuevo mensaje de contacto'} ${quote.number}`,
      '',
      rowsText(rows),
      '',
      'Mensaje:',
      quote.message,
      ...(files.length ? ['', 'Archivos adjuntos:', ...files] : []),
      '',
      `Abrir en el panel: ${adminUrl}`,
    ].join('\n'),
    replyTo: quote.email,
  })
}
