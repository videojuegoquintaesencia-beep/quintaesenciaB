/**
 * Emails de pedidos: confirmación al cliente, avisos de cambio de estado y alerta interna a la tienda.
 * Cada texto va en HTML (maquetación con tablas y estilos en línea) y en texto plano.
 * Todo valor que viene del cliente se escapa antes de entrar en el HTML.
 */
import 'server-only'
import { site } from '@/config/site'
import { absoluteUrl, adminNotifyAddress, emailShell, escapeHtml as esc, ownerLine, sendMail, type MailResult } from '../email'
import { formatEUR, unidades } from '../format'
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL } from '../order-status'
import { ENTITY_WORD } from './names'
import type { Order, OrderItem } from '../orders'

/** Enlace público de seguimiento del pedido (incluye el token secreto). */
export function orderTrackingUrl(order: Pick<Order, 'id' | 'publicToken'>): string {
  return absoluteUrl(`/pedido/${order.id}?t=${order.publicToken}`)
}

const MUTED = '#4a4270'
const LINE = '#e9e3f5'

/* ───────────── Piezas comunes ───────────── */

/** Nombre de pila para el saludo; si el nombre es el de una entidad ("Club Deportivo Los Pinos") se usa entero. */
const firstName = (order: Order) => {
  const full = order.customerName.trim()
  const first = full.split(/\s+/)[0] ?? full
  return ENTITY_WORD.test(first) ? full : first
}

/** "2 × M, 1 × L · 3 unidades" (en productos de talla única, solo "6 unidades"). */
function sizesText(it: OrderItem): string {
  const sized = Object.entries(it.sizes)
    .filter(([size, q]) => q > 0 && size !== 'unica')
    .map(([size, q]) => `${q} × ${size}`)
  return sized.length > 0 ? `${sized.join(', ')} · ${unidades(it.quantity)}` : unidades(it.quantity)
}

function addressLines(order: Order): string[] {
  const a = order.shipping
  return [a.name, a.line1, a.line2 ?? '', `${a.postalCode} ${a.city} (${a.province})`, 'España'].filter(Boolean)
}

function sectionTitle(text: string): string {
  return `<p style="margin:22px 0 6px;font-family:Fredoka,Arial,sans-serif;font-size:16px;font-weight:700;color:#1b1340">${esc(text)}</p>`
}

function itemsHtml(order: Order): string {
  const rows = order.items
    .map((it) => {
      const discount =
        it.discountCents > 0
          ? `<br><span style="font-size:13px;color:${MUTED}">Descuento por cantidad (${it.discountPct}\u00a0%): −${esc(formatEUR(it.discountCents))}</span>`
          : ''
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};vertical-align:top">
          <strong>${esc(it.productName)}</strong>
          <span style="display:inline-block;width:11px;height:11px;margin:0 4px 0 8px;border:1px solid #1b1340;border-radius:50%;background:${esc(it.colorHex)};vertical-align:middle"></span>${esc(it.colorName)}<br>
          <span style="font-size:14px;color:${MUTED}">${esc(sizesText(it))}</span>${discount}
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${LINE};text-align:right;white-space:nowrap;vertical-align:top;font-weight:700">${esc(formatEUR(it.totalCents))}</td>
      </tr>`
    })
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0">${rows}</table>`
}

function totalsHtml(order: Order): string {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;${strong ? 'font-weight:800;font-size:17px;' : `color:${MUTED};`}">${esc(label)}</td><td style="padding:4px 0;text-align:right;${strong ? 'font-weight:800;font-size:17px;' : ''}">${esc(value)}</td></tr>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0">
    ${row('Subtotal', formatEUR(order.subtotalCents))}
    ${row('Envío', order.shippingCents === 0 ? 'Gratis' : formatEUR(order.shippingCents))}
    ${row('Total', formatEUR(order.totalCents), true)}
    ${row('IVA incluido', formatEUR(order.vatCents))}
  </table>`
}

function addressHtml(order: Order): string {
  return `<p style="margin:0;line-height:1.5">${addressLines(order).map(esc).join('<br>')}</p>`
}

function itemsText(order: Order): string {
  return order.items
    .map((it) => {
      const discount = it.discountCents > 0 ? ` (descuento ${it.discountPct}\u00a0%: −${formatEUR(it.discountCents)})` : ''
      return `- ${it.productName}, ${it.colorName} · ${sizesText(it)} · ${formatEUR(it.totalCents)}${discount}`
    })
    .join('\n')
}

function totalsText(order: Order): string {
  return [
    `Subtotal: ${formatEUR(order.subtotalCents)}`,
    `Envío: ${order.shippingCents === 0 ? 'Gratis' : formatEUR(order.shippingCents)}`,
    `Total: ${formatEUR(order.totalCents)} (IVA incluido: ${formatEUR(order.vatCents)})`,
  ].join('\n')
}

const isDemo = (order: Order) => order.payment.provider === 'demo'

/* ───────────── Confirmación al cliente ───────────── */

/** Información precontractual en soporte duradero (art. 98.7 y 103.c TRLGDCU) y datos de factura. */
function legalNoticeParts(order: Order) {
  const conditionsUrl = absoluteUrl('/legal/condiciones')
  const withdrawal =
    'Al ser productos personalizados, este pedido no tiene derecho de desistimiento de 14 días (art. 103.c del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios). Si compras como consumidor, conservas la garantía legal de 3 años por falta de conformidad.'
  const billing =
    order.company || order.taxId
      ? `Datos de facturación: ${[order.company, order.taxId].filter(Boolean).join(' · ')}. Te enviaremos la factura por email.`
      : '¿Necesitas factura? Responde a este email con tu número de pedido y tus datos fiscales.'
  return { conditionsUrl, withdrawal, billing }
}

export async function sendOrderConfirmation(order: Order): Promise<MailResult> {
  const url = orderTrackingUrl(order)
  const owner = await ownerLine()
  const lead = `de ${site.production.leadDaysMin} a ${site.production.leadDaysMax} días laborables`
  const demo = isDemo(order)
  const notice = legalNoticeParts(order)
  const demoHtml = demo
    ? `<p style="background:#fff0bd;border:2px solid #1b1340;border-radius:12px;padding:10px 14px;font-weight:700">Pedido de demostración: no se ha cobrado nada.</p>`
    : ''
  const html = await emailShell({
    title: `¡Gracias, ${firstName(order)}! Tu pedido ${order.number} está confirmado`,
    preheader: demo
      ? 'Pedido de demostración: no se ha cobrado nada.'
      : `Hemos recibido tu pago de ${formatEUR(order.totalCents)}. Empezamos con tu diseño.`,
    bodyHtml: `${demoHtml}
      <p style="margin:0 0 8px">${esc(ORDER_STATUS_CUSTOMER_TEXT.paid)}</p>
      <p style="margin:0">Tardamos <strong>${esc(lead)}</strong> en producir tu pedido y después sale por ${esc(site.shipping.carrierLabel)}. Te escribiremos en cuanto cambie su estado.</p>
      ${sectionTitle(`Resumen del pedido ${order.number}`)}
      ${itemsHtml(order)}
      ${totalsHtml(order)}
      ${sectionTitle('Dirección de envío')}
      ${addressHtml(order)}
      ${sectionTitle('Información importante')}
      <p style="margin:0 0 8px;font-size:14px;color:${MUTED}"><strong>Desistimiento y garantía.</strong> ${esc(notice.withdrawal)} Condiciones de venta: <a href="${esc(notice.conditionsUrl)}" style="color:#5a3fe0">${esc(notice.conditionsUrl)}</a>.</p>
      <p style="margin:0 0 8px;font-size:14px;color:${MUTED}"><strong>Factura.</strong> ${esc(notice.billing)}</p>
      <p style="margin:0;font-size:14px;color:${MUTED}"><strong>Titular.</strong> ${esc(owner)}</p>
      <p style="margin:22px 0 0;font-size:14px;color:${MUTED}">¿Algo no cuadra? Responde a este email o escríbenos a <a href="mailto:${esc(site.contact.email)}" style="color:#5a3fe0">${esc(site.contact.email)}</a> indicando tu número de pedido.</p>`,
    ctaLabel: 'Ver el estado de mi pedido',
    ctaUrl: url,
  })
  const text = [
    `¡Gracias, ${firstName(order)}! Tu pedido ${order.number} está confirmado.`,
    demo ? '\n(Pedido de demostración: no se ha cobrado nada.)' : '',
    `\n${ORDER_STATUS_CUSTOMER_TEXT.paid}`,
    `Producción: ${lead}, y después envío por ${site.shipping.carrierLabel}.`,
    `\nRESUMEN\n${itemsText(order)}\n\n${totalsText(order)}`,
    `\nDIRECCIÓN DE ENVÍO\n${addressLines(order).join('\n')}`,
    `\nINFORMACIÓN IMPORTANTE\nDesistimiento y garantía: ${notice.withdrawal} Condiciones de venta: ${notice.conditionsUrl}`,
    `Factura: ${notice.billing}`,
    `Titular: ${owner}`,
    `\nVer el estado de tu pedido: ${url}`,
    `Dudas: ${site.contact.email}`,
  ].join('\n')
  return sendMail({
    to: order.email,
    subject: `Pedido ${order.number} confirmado — ${site.name}`,
    html,
    text,
    replyTo: site.contact.email || undefined,
  })
}

/* ───────────── Cambios de estado ───────────── */

export async function sendOrderStatusUpdate(order: Order, opts: { note?: string } = {}): Promise<MailResult> {
  const url = orderTrackingUrl(order)
  const label = ORDER_STATUS_LABEL[order.status]
  const body = ORDER_STATUS_CUSTOMER_TEXT[order.status]
  const tracking = order.trackingCode
    ? `<p style="margin:14px 0 0"><strong>Seguimiento del envío:</strong> ${esc(order.carrier ?? 'Mensajería')} · <span style="font-family:monospace">${esc(order.trackingCode)}</span></p>`
    : ''
  const note = opts.note
    ? `<p style="margin:14px 0 0;background:#fff8ec;border:2px solid #1b1340;border-radius:12px;padding:12px 14px">${esc(opts.note)}</p>`
    : ''
  const demo = isDemo(order)
  const demoHtml = demo
    ? `<p style="margin:0 0 12px;background:#fff0bd;border:2px solid #1b1340;border-radius:12px;padding:10px 14px;font-weight:700">Pedido de demostración: no se ha cobrado nada.</p>`
    : ''
  const html = await emailShell({
    title: `Pedido ${order.number}: ${label}`,
    preheader: demo ? 'Pedido de demostración: no se ha cobrado nada.' : body,
    bodyHtml: `${demoHtml}<p style="margin:0">${esc(body)}</p>${tracking}${note}
      <p style="margin:18px 0 0;font-size:14px;color:${MUTED}">Si tienes cualquier duda, responde a este email o escríbenos a ${esc(site.contact.email)}.</p>`,
    ctaLabel: 'Ver mi pedido',
    ctaUrl: url,
  })
  const text = [
    `Pedido ${order.number}: ${label}`,
    demo ? '(Pedido de demostración: no se ha cobrado nada.)' : '',
    body,
    order.trackingCode ? `Seguimiento del envío: ${order.carrier ?? 'Mensajería'} ${order.trackingCode}` : '',
    opts.note ? `\n${opts.note}` : '',
    `\nVer mi pedido: ${url}`,
  ]
    .filter((l) => l !== '')
    .join('\n')
  return sendMail({
    to: order.email,
    subject: `Pedido ${order.number}: ${label} — ${site.name}`,
    html,
    text,
    replyTo: site.contact.email || undefined,
  })
}

/* ───────────── Aviso interno a la tienda ───────────── */

function printsText(order: Order): string {
  return order.items
    .map((it) => {
      const zones = it.prints.map((p) => `${p.label} (${Math.round(p.usedCm2)} cm²)`).join(', ')
      return `- ${it.productName} ${it.colorName} · ${sizesText(it)} · Estampado: ${zones}${it.note ? ` · Nota: ${it.note}` : ''}`
    })
    .join('\n')
}

export async function sendOrderAdminAlert(order: Order): Promise<MailResult> {
  const to = await adminNotifyAddress()
  if (!to) return { ok: false, error: 'Sin destinatario de avisos' }
  const adminUrl = absoluteUrl(`/admin/pedidos/${order.id}`)
  const units = order.items.reduce((n, it) => n + it.quantity, 0)
  const demo = isDemo(order)
  const who = [order.company, order.taxId ? `NIF/CIF ${order.taxId}` : null].filter((v): v is string => !!v)
  const itemNotes = order.items
    .map((it) => (it.note ? `<li>${esc(it.productName)} ${esc(it.colorName)}: ${esc(it.note)}</li>` : ''))
    .join('')
  const html = await emailShell({
    title: `Nuevo pedido ${order.number} · ${formatEUR(order.totalCents)}`,
    preheader: `${order.customerName} · ${units} ${units === 1 ? 'unidad' : 'unidades'}`,
    bodyHtml: `${demo ? `<p style="background:#fff0bd;border:2px solid #1b1340;border-radius:12px;padding:10px 14px;font-weight:700">PAGO SIMULADO (modo demostración): no hay cobro real.</p>` : ''}
      <p style="margin:0"><strong>${esc(order.customerName)}</strong>${who.length ? ` · ${who.map(esc).join(' · ')}` : ''}<br>
      <a href="mailto:${esc(order.email)}" style="color:#5a3fe0">${esc(order.email)}</a> · ${esc(order.phone)}</p>
      ${sectionTitle(`${units} ${units === 1 ? 'unidad' : 'unidades'}`)}
      ${itemsHtml(order)}
      ${totalsHtml(order)}
      ${sectionTitle('Envío a')}
      ${addressHtml(order)}
      ${order.customerNote ? `${sectionTitle('Nota del cliente')}<p style="margin:0">${esc(order.customerNote)}</p>` : ''}
      ${itemNotes ? `${sectionTitle('Notas por producto')}<ul style="margin:0;padding-left:18px">${itemNotes}</ul>` : ''}`,
    ctaLabel: 'Abrir en el panel',
    ctaUrl: adminUrl,
  })
  const text = [
    `Nuevo pedido ${order.number} · ${formatEUR(order.totalCents)}${demo ? ' (PAGO SIMULADO, sin cobro real)' : ''}`,
    `${order.customerName}${who.length ? ` · ${who.join(' · ')}` : ''}`,
    `${order.email} · ${order.phone}`,
    `\n${printsText(order)}`,
    `\n${totalsText(order)}`,
    `\nEnvío a:\n${addressLines(order).join('\n')}`,
    order.customerNote ? `\nNota del cliente: ${order.customerNote}` : '',
    `\nPanel: ${adminUrl}`,
  ].join('\n')
  return sendMail({
    to,
    subject: `Nuevo pedido ${order.number} — ${formatEUR(order.totalCents)}${demo ? ' (demo)' : ''}`,
    html,
    text,
    replyTo: order.email,
  })
}
