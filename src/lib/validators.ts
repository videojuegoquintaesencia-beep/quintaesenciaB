/**
 * Esquemas de validación compartidos entre formularios (cliente) y rutas de API (servidor).
 * Los mensajes están en español porque se muestran al usuario.
 */
import { z } from 'zod'
import './zod-es'
import { addressZoneIssue, undeliverableMessage, type DeliveryRules } from './es-provinces'
import { isPostalCodeDeliverable, isValidSpanishPostalCode, normalizePostalCode } from './pricing'
import { DEFAULT_CATALOG } from './settings-schema'

const cleanText = (max: number, min = 1, msg = 'Campo obligatorio') =>
  z.string().trim().min(min, msg).max(max, `Máximo ${max} caracteres`)

/**
 * Email estricto: forma "local@dominio" con la parte local en punto-átomo y un subconjunto prudente de símbolos
 * (letras, números y `. _ + & ' -`) y un dominio de etiquetas ASCII. Las comas, puntos y comas, comillas, ángulos
 * y paréntesis (que el estándar solo permite entrecomillados) se rechazan: si no, "x,otro@dominio.es" pasaba la
 * validación y el servidor de correo entregaba el mensaje a "otro@dominio.es".
 */
export function isValidEmail(value: string): boolean {
  if (value.length > 254) return false
  const at = value.indexOf('@')
  if (at < 1 || at !== value.lastIndexOf('@')) return false
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (local.length > 64 || !/^[a-z0-9_+&'-]+(\.[a-z0-9_+&'-]+)*$/.test(local)) return false
  const labels = domain.split('.')
  if (labels.length < 2) return false
  const tld = labels[labels.length - 1]
  if (!/^([a-z]{2,24}|xn--[a-z0-9-]{2,59})$/.test(tld)) return false
  return labels.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l))
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Introduce tu email')
  .max(160, 'Máximo 160 caracteres')
  .refine(isValidEmail, 'Introduce un email válido')

/** Teléfono: admite espacios, guiones y prefijo internacional. Se guarda solo con dígitos y "+" inicial. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Introduce un teléfono de contacto')
  .max(30, 'Teléfono demasiado largo')
  .transform((v) => v.replace(/[\s().-]/g, ''))
  .refine((v) => /^\+?\d{9,15}$/.test(v), 'Introduce un teléfono válido (9 a 15 dígitos)')

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30, 'Teléfono demasiado largo')
  .transform((v) => v.replace(/[\s().-]/g, ''))
  .refine((v) => v === '' || /^\+?\d{9,15}$/.test(v), 'Introduce un teléfono válido')
  .optional()

/**
 * Código postal español dentro de la zona de envío. Las zonas excluidas se editan en el panel, así que el esquema
 * se construye con las reglas efectivas (`catalog.shipping`): en el servidor desde `getCatalog()`, en el navegador
 * desde `useCatalog()`.
 */
export function postalCodeSchemaFor(rules: DeliveryRules) {
  return z
    .string()
    .trim()
    .transform(normalizePostalCode)
    .refine(isValidSpanishPostalCode, 'Código postal no válido')
    .refine((cp) => isPostalCodeDeliverable(cp, rules), undeliverableMessage(rules))
}

/** NIF/NIE/CIF en formato básico (no comprueba la letra de control). Opcional. */
export const taxIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === '' || /^[A-Z0-9][0-9]{7}[A-Z0-9]$/.test(v), 'NIF/CIF no válido')
  .optional()

/** Dirección de envío validada con las reglas de envío efectivas (ver `postalCodeSchemaFor`). */
export function addressSchemaFor(rules: DeliveryRules) {
  return z
    .object({
      name: cleanText(100, 2, 'Nombre y apellidos'),
      line1: cleanText(160, 4, 'Dirección'),
      line2: z.string().trim().max(160, 'Máximo 160 caracteres').optional(),
      postalCode: postalCodeSchemaFor(rules),
      city: cleanText(80, 2, 'Localidad'),
      province: cleanText(80, 2, 'Provincia'),
      country: z.literal('ES').default('ES'),
    })
    .superRefine((address, ctx) => {
      // El envío depende del código postal: provincia y localidad no pueden contradecirlo (ni apuntar a zonas sin envío).
      const issue = addressZoneIssue(address, rules)
      if (issue) ctx.addIssue({ code: 'custom', path: [issue.field], message: issue.message })
    })
}

/** Dirección con las reglas de envío por defecto (las de código). El checkout usa `addressSchemaFor(catalog.shipping)`. */
export const addressSchema = addressSchemaFor(DEFAULT_CATALOG.shipping)
export type Address = z.infer<typeof addressSchema>

export const COMPANY_REQUIRED_MESSAGE = 'Escribe el nombre de la empresa para la factura.'
export const TAX_ID_REQUIRED_MESSAGE = 'Escribe el NIF/CIF para la factura.'

export const customerSchema = z
  .object({
    name: cleanText(100, 2, 'Nombre y apellidos'),
    email: emailSchema,
    phone: phoneSchema,
    /** Empresa (opcional): si se rellena se mostrará en la hoja de producción y en la factura. */
    company: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
    taxId: taxIdSchema,
  })
  .superRefine((customer, ctx) => {
    // Los datos de factura van juntos: con empresa sin NIF/CIF (o al revés) no se puede emitir la factura.
    // El formulario solo envía estos campos si se marca "Compro como empresa", y entonces exige los dos.
    if (customer.company && !customer.taxId) ctx.addIssue({ code: 'custom', path: ['taxId'], message: TAX_ID_REQUIRED_MESSAGE })
    if (customer.taxId && !customer.company) ctx.addIssue({ code: 'custom', path: ['company'], message: COMPANY_REQUIRED_MESSAGE })
  })
export type Customer = z.infer<typeof customerSchema>

/* ───────────── Contacto y presupuestos ───────────── */

const fileIds = z.array(z.string().regex(/^[a-z0-9]{12,40}$/)).max(5).default([])

export const contactMessageSchema = z.object({
  name: cleanText(100, 2, 'Dinos tu nombre'),
  email: emailSchema,
  phone: optionalPhoneSchema,
  message: cleanText(2000, 10, 'Cuéntanos en qué podemos ayudarte (mínimo 10 caracteres)'),
  consent: z.literal(true, { error: 'Debes aceptar la política de privacidad' }),
  /** Campo trampa anti-bots: debe llegar vacío. */
  website: z.string().max(0).optional(),
})
export type ContactMessageInput = z.infer<typeof contactMessageSchema>

export const QUOTE_PRODUCT_OPTIONS = ['camiseta', 'hoodie', 'gorra', 'taza', 'otro'] as const

export const quoteRequestSchema = z.object({
  name: cleanText(100, 2, 'Dinos tu nombre'),
  company: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
  email: emailSchema,
  phone: optionalPhoneSchema,
  products: z.array(z.enum(QUOTE_PRODUCT_OPTIONS)).min(1, 'Elige al menos un producto').max(5),
  /** Unidades aproximadas en total. */
  quantity: z.coerce.number().int().min(1, 'Indica unas unidades aproximadas').max(100000),
  /** Fecha límite deseada (AAAA-MM-DD) */
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
    .optional()
    .or(z.literal('')),
  message: cleanText(2000, 10, 'Cuéntanos qué necesitas (mínimo 10 caracteres)'),
  /** Logotipos o diseños subidos con /api/uploads (kind "quote"). */
  fileIds,
  consent: z.literal(true, { error: 'Debes aceptar la política de privacidad' }),
  website: z.string().max(0).optional(),
})
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>

/** Primer mensaje de error de un ZodError, en formato legible. */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Datos no válidos'
}

/** Errores por campo (para pintarlos junto a cada input). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
