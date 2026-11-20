import { site } from '@/config/site'

/** Teléfono en formato tel: (solo dígitos y "+"). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/**
 * Enlace wa.me con mensaje inicial; cadena vacía si no hay WhatsApp configurado. El número sale de los ajustes
 * efectivos (`getSettings().contact.whatsapp`), que los componentes de servidor pasan aquí.
 */
export function whatsappHref(whatsapp: string, message = 'Hola, quería información sobre un pedido personalizado.'): string {
  const number = whatsapp.replace(/\D/g, '')
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : ''
}

/** Enlace a un perfil social: acepta una URL completa o solo el usuario. */
export function socialHref(value: string, base: string): string {
  return /^https?:\/\//i.test(value) ? value : `${base}${value.replace(/^@/, '')}`
}

/** Usuario que se muestra para un perfil social: de la URL completa se queda con el nombre ("@taller"). */
export function socialHandle(value: string, host: 'instagram' | 'tiktok'): string {
  const pattern = host === 'instagram' ? /^https?:\/\/(www\.)?instagram\.com\// : /^https?:\/\/(www\.)?tiktok\.com\/@?/
  const handle = value.replace(pattern, '').replace(/\/.*$/, '').replace(/^@/, '')
  return handle ? `@${handle}` : value
}

export const siteHost = site.url.replace(/^https?:\/\//, '')
