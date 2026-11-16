/**
 * Envío de emails (SMTP con nodemailer). Si no hay SMTP configurado (SMTP_HOST vacío),
 * el email NO se envía: se muestra en la consola del servidor (útil en desarrollo).
 */
import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import { site } from '@/config/site'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** URL absoluta del sitio a partir de una ruta ("/pedido/abc" → "https://…/pedido/abc"). */
export function absoluteUrl(path = '/'): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`
}

/** Dirección que recibe los avisos internos (pedidos nuevos, presupuestos, mensajes). */
export function adminNotifyAddress(): string | null {
  return process.env.ADMIN_NOTIFY_EMAIL || site.contact.email || null
}

type G = typeof globalThis & { __puMailer?: Transporter | null }
const g = globalThis as G

function transporter(): Transporter | null {
  if (g.__puMailer !== undefined) return g.__puMailer
  const host = process.env.SMTP_HOST
  if (!host) {
    g.__puMailer = null
    return null
  }
  g.__puMailer = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  })
  return g.__puMailer
}

export interface MailInput {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export interface MailResult {
  ok: boolean
  /** true si no hay SMTP y el email solo se escribió en la consola. */
  simulated?: boolean
  error?: string
}

/** Nunca lanza: devuelve el resultado para que un fallo de email no rompa un pedido. */
export async function sendMail(input: MailInput): Promise<MailResult> {
  const t = transporter()
  if (!t) {
    console.log(
      `\n[email simulado] Para: ${input.to}\nAsunto: ${input.subject}\n${input.text}\n───────────────────────────\n`,
    )
    return { ok: true, simulated: true }
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `${site.name} <${site.contact.email}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Error al enviar:', message)
    return { ok: false, error: message }
  }
}

/** Plantilla HTML común (maquetación con tablas e CSS en línea para compatibilidad con clientes de correo). */
export function emailShell(opts: {
  title: string
  preheader?: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
}): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:28px 0 8px"><a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;background:#ff4f9a;color:#1b1340;font-weight:800;text-decoration:none;padding:14px 26px;border:2px solid #1b1340;border-radius:999px;box-shadow:3px 3px 0 #1b1340">${escapeHtml(opts.ctaLabel)}</a></p>`
      : ''
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#fff8ec;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#1b1340">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader ?? '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ec"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td style="padding:0 4px 14px;font-family:Fredoka,Arial,sans-serif;font-size:26px;font-weight:700;color:#1b1340">
      <span style="display:inline-block;background:#ffc93c;border:2px solid #1b1340;border-radius:12px;padding:4px 12px;box-shadow:3px 3px 0 #1b1340">${escapeHtml(site.name)}</span>
    </td></tr>
    <tr><td style="background:#ffffff;border:2px solid #1b1340;border-radius:20px;padding:28px 26px;box-shadow:5px 5px 0 #1b1340">
      <h1 style="margin:0 0 14px;font-family:Fredoka,Arial,sans-serif;font-size:24px;line-height:1.2;color:#1b1340">${escapeHtml(opts.title)}</h1>
      <div style="font-size:16px;line-height:1.55">${opts.bodyHtml}</div>
      ${cta}
    </td></tr>
    <tr><td style="padding:18px 8px;font-size:13px;line-height:1.5;color:#4a4270;text-align:center">
      ${escapeHtml(site.name)} · ${escapeHtml(site.contact.email)}${site.contact.phone ? ` · ${escapeHtml(site.contact.phone)}` : ''}<br>
      Recibes este email porque has hecho un pedido o una consulta en ${escapeHtml(site.url.replace(/^https?:\/\//, ''))}.
    </td></tr>
  </table>
</td></tr></table></body></html>`
}
