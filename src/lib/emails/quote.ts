/**
 * Emails de presupuestos y mensajes de contacto. (Base mínima funcional: el agente de contenido
 * puede mejorar el diseño y el copy manteniendo estas firmas.)
 */
import 'server-only'
import { site } from '@/config/site'
import { absoluteUrl, adminNotifyAddress, emailShell, escapeHtml, sendMail, type MailResult } from '../email'
import type { Quote } from '../quotes'

/** Acuse de recibo al cliente. */
export async function sendQuoteReceived(quote: Quote): Promise<MailResult> {
  const isQuote = quote.kind === 'quote'
  return sendMail({
    to: quote.email,
    subject: isQuote ? `Hemos recibido tu solicitud de presupuesto (${quote.number})` : `Hemos recibido tu mensaje (${quote.number})`,
    html: emailShell({
      title: isQuote ? 'Solicitud de presupuesto recibida' : 'Mensaje recibido',
      preheader: 'Te respondemos en 1-2 días laborables.',
      bodyHtml: `<p>Hola ${escapeHtml(quote.name.split(' ')[0])}, gracias por escribirnos. Hemos recibido tu ${isQuote ? 'solicitud' : 'mensaje'} y te responderemos en 1-2 días laborables.</p>
        <p style="background:#fff8ec;border-radius:12px;padding:12px 14px;white-space:pre-wrap">${escapeHtml(quote.message)}</p>
        <p>Referencia: <strong>${escapeHtml(quote.number)}</strong></p>`,
    }),
    text: `Hola ${quote.name}, hemos recibido tu ${isQuote ? 'solicitud de presupuesto' : 'mensaje'} (${quote.number}). Te respondemos en 1-2 días laborables.\n\n${quote.message}`,
    replyTo: site.contact.email || undefined,
  })
}

/** Aviso interno al negocio. */
export async function sendQuoteAdminAlert(quote: Quote): Promise<MailResult> {
  const to = adminNotifyAddress()
  if (!to) return { ok: false, error: 'Sin destinatario de avisos' }
  const isQuote = quote.kind === 'quote'
  const adminUrl = absoluteUrl('/admin/presupuestos')
  const lines = [
    `${quote.name}${quote.company ? ` (${quote.company})` : ''} <${quote.email}>${quote.phone ? ` · ${quote.phone}` : ''}`,
    isQuote ? `Productos: ${quote.products.join(', ')} · Unidades: ${quote.quantity ?? '?'}${quote.deadline ? ` · Fecha: ${quote.deadline}` : ''}` : '',
    '',
    quote.message,
  ].filter((l, i) => l !== '' || i > 1)
  return sendMail({
    to,
    subject: `${isQuote ? 'Nuevo presupuesto' : 'Nuevo mensaje'} ${quote.number} — ${quote.name}`,
    html: emailShell({
      title: `${isQuote ? 'Nueva solicitud de presupuesto' : 'Nuevo mensaje de contacto'} ${quote.number}`,
      bodyHtml: `<p style="white-space:pre-wrap">${escapeHtml(lines.join('\n'))}</p>`,
      ctaLabel: 'Abrir en el panel',
      ctaUrl: adminUrl,
    }),
    text: `${lines.join('\n')}\n\n${adminUrl}`,
    replyTo: quote.email,
  })
}
