/** Enlaces de contacto (mailto, tel, WhatsApp) construidos de forma segura a partir de datos del cliente. */

export function mailtoHref(email: string, opts: { subject?: string; body?: string } = {}): string {
  const params: string[] = []
  if (opts.subject) params.push(`subject=${encodeURIComponent(opts.subject)}`)
  if (opts.body) params.push(`body=${encodeURIComponent(opts.body)}`)
  return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}${params.length ? `?${params.join('&')}` : ''}`
}

export function telHref(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? '').replace(/[^\d+]/g, '')
  return cleaned.replace(/\D/g, '').length >= 6 ? `tel:${cleaned}` : null
}

/**
 * Enlace wa.me. Los teléfonos españoles de 9 dígitos sin prefijo reciben el 34.
 * Devuelve null si el número no parece válido.
 */
export function whatsappHref(phone: string | null | undefined, text?: string): string | null {
  const raw = (phone ?? '').trim()
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('00')) digits = digits.slice(2)
  else if (!raw.startsWith('+') && digits.length === 9) digits = `34${digits}`
  if (digits.length < 10 || digits.length > 15) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? ''
}
