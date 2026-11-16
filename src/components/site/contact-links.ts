import { site } from '@/config/site'

export interface ContactLink {
  key: 'email' | 'phone' | 'whatsapp' | 'instagram' | 'tiktok'
  label: string
  /** Texto que se muestra. */
  text: string
  href: string
  /** Abre en otra pestaña (enlaces externos). */
  external?: boolean
}

function social(value: string, base: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `${base}${value.replace(/^@/, '')}`
}

/** Enlaces de contacto con datos reales de `site.contact`; los campos vacíos se omiten. */
export function contactLinks(): ContactLink[] {
  const c = site.contact
  const out: ContactLink[] = []
  if (c.email) out.push({ key: 'email', label: 'Correo', text: c.email, href: `mailto:${c.email}` })
  if (c.phone) out.push({ key: 'phone', label: 'Teléfono', text: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}` })
  if (c.whatsapp)
    out.push({ key: 'whatsapp', label: 'WhatsApp', text: 'Escríbenos por WhatsApp', href: whatsappUrl(), external: true })
  if (c.instagram)
    out.push({ key: 'instagram', label: 'Instagram', text: 'Instagram', href: social(c.instagram, 'https://www.instagram.com/'), external: true })
  if (c.tiktok)
    out.push({ key: 'tiktok', label: 'TikTok', text: 'TikTok', href: social(c.tiktok, 'https://www.tiktok.com/@'), external: true })
  return out
}

/** Enlace wa.me con un mensaje inicial (vacío si no hay WhatsApp configurado). */
export function whatsappUrl(message = 'Hola, quería información sobre un pedido personalizado.'): string {
  const number = site.contact.whatsapp.replace(/\D/g, '')
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
