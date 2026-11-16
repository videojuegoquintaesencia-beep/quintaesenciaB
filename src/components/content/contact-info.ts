import { site } from '@/config/site'

/** Teléfono en formato tel: (solo dígitos y "+"). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** Enlace wa.me con mensaje inicial; cadena vacía si no hay WhatsApp configurado. */
export function whatsappHref(message = 'Hola, quería información sobre un pedido personalizado.'): string {
  const number = site.contact.whatsapp.replace(/\D/g, '')
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : ''
}

/** Enlace a un perfil social: acepta una URL completa o solo el usuario. */
export function socialHref(value: string, base: string): string {
  return /^https?:\/\//i.test(value) ? value : `${base}${value.replace(/^@/, '')}`
}

export const siteHost = site.url.replace(/^https?:\/\//, '')
