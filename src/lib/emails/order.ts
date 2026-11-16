/**
 * Emails de pedidos. (Base mínima funcional: el agente de checkout puede mejorar el diseño y el copy
 * manteniendo estas firmas, porque las usan las rutas de pago y el panel de administración.)
 */
import 'server-only'
import { site } from '@/config/site'
import { absoluteUrl, adminNotifyAddress, emailShell, escapeHtml, sendMail, type MailResult } from '../email'
import { formatEUR } from '../format'
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL } from '../order-status'
import type { Order } from '../orders'

/** Enlace público de seguimiento del pedido (incluye el token secreto). */
export function orderTrackingUrl(order: Pick<Order, 'id' | 'publicToken'>): string {
  return absoluteUrl(`/pedido/${order.id}?t=${order.publicToken}`)
}

function itemsHtml(order: Order): string {
  const rows = order.items
    .map(
      (it) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(it.productName)} · ${escapeHtml(it.colorName)}<br>
          <span style="color:#4a4270;font-size:14px">${Object.entries(it.sizes)
            .filter(([, q]) => q > 0)
            .map(([s, q]) => `${q} × ${s === 'unica' ? 'talla única' : escapeHtml(s)}`)
            .join(', ')}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatEUR(it.totalCents)}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows}
    <tr><td style="padding:6px 0;color:#4a4270">Envío</td><td style="padding:6px 0;text-align:right">${order.shippingCents === 0 ? 'Gratis' : formatEUR(order.shippingCents)}</td></tr>
    <tr><td style="padding:8px 0;font-weight:800">Total (IVA incluido)</td><td style="padding:8px 0;text-align:right;font-weight:800">${formatEUR(order.totalCents)}</td></tr>
  </table>`
}

function itemsText(order: Order): string {
  return order.items
    .map((it) => `- ${it.productName} ${it.colorName} · ${it.quantity} ud. · ${formatEUR(it.totalCents)}`)
    .join('\n')
}

export async function sendOrderConfirmation(order: Order): Promise<MailResult> {
  const url = orderTrackingUrl(order)
  return sendMail({
    to: order.email,
    subject: `Pedido ${order.number} confirmado — ${site.name}`,
    html: emailShell({
      title: `¡Gracias, ${order.customerName.split(' ')[0]}! Pedido ${order.number}`,
      preheader: 'Hemos recibido tu pedido y tu pago.',
      bodyHtml: `<p>Hemos recibido tu pedido y tu pago. Empezamos a preparar tu diseño.</p>${itemsHtml(order)}
        <p>Plazo estimado de producción: ${site.production.leadDaysMin}-${site.production.leadDaysMax} días laborables, más el envío.</p>`,
      ctaLabel: 'Ver mi pedido',
      ctaUrl: url,
    }),
    text: `Gracias por tu pedido ${order.number}.\n\n${itemsText(order)}\n\nTotal: ${formatEUR(order.totalCents)}\nSeguimiento: ${url}`,
  })
}

export async function sendOrderStatusUpdate(order: Order, opts: { note?: string } = {}): Promise<MailResult> {
  const url = orderTrackingUrl(order)
  const tracking = order.trackingCode
    ? `<p><strong>Seguimiento del envío:</strong> ${escapeHtml(order.carrier ?? 'Mensajería')} · ${escapeHtml(order.trackingCode)}</p>`
    : ''
  return sendMail({
    to: order.email,
    subject: `Pedido ${order.number}: ${ORDER_STATUS_LABEL[order.status]}`,
    html: emailShell({
      title: ORDER_STATUS_LABEL[order.status],
      preheader: ORDER_STATUS_CUSTOMER_TEXT[order.status],
      bodyHtml: `<p>${escapeHtml(ORDER_STATUS_CUSTOMER_TEXT[order.status])}</p>${tracking}${
        opts.note ? `<p style="background:#fff8ec;border-radius:12px;padding:12px 14px">${escapeHtml(opts.note)}</p>` : ''
      }`,
      ctaLabel: 'Ver mi pedido',
      ctaUrl: url,
    }),
    text: `Pedido ${order.number}: ${ORDER_STATUS_LABEL[order.status]}\n${ORDER_STATUS_CUSTOMER_TEXT[order.status]}${
      order.trackingCode ? `\nSeguimiento: ${order.carrier ?? ''} ${order.trackingCode}` : ''
    }${opts.note ? `\n\n${opts.note}` : ''}\n\n${url}`,
  })
}

export async function sendOrderAdminAlert(order: Order): Promise<MailResult> {
  const to = adminNotifyAddress()
  if (!to) return { ok: false, error: 'Sin destinatario de avisos' }
  const adminUrl = absoluteUrl(`/admin/pedidos/${order.id}`)
  return sendMail({
    to,
    subject: `Nuevo pedido ${order.number} — ${formatEUR(order.totalCents)}`,
    html: emailShell({
      title: `Nuevo pedido ${order.number}`,
      preheader: `${order.customerName} · ${formatEUR(order.totalCents)}`,
      bodyHtml: `<p><strong>${escapeHtml(order.customerName)}</strong>${order.company ? ` (${escapeHtml(order.company)})` : ''}<br>${escapeHtml(order.email)} · ${escapeHtml(order.phone)}</p>${itemsHtml(order)}`,
      ctaLabel: 'Abrir en el panel',
      ctaUrl: adminUrl,
    }),
    text: `Nuevo pedido ${order.number}\n${order.customerName} <${order.email}>\n\n${itemsText(order)}\n\nTotal: ${formatEUR(order.totalCents)}\n${adminUrl}`,
  })
}
