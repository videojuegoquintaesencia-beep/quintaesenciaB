import { z } from 'zod'
import type { CartLine } from '@/lib/cart-store'
import { isPostalCodeDeliverable, isValidSpanishPostalCode, normalizePostalCode } from '@/lib/pricing'
import { COMPANY_REQUIRED_MESSAGE, TAX_ID_REQUIRED_MESSAGE, addressSchema, customerSchema, fieldErrors } from '@/lib/validators'

export interface FormValues {
  name: string
  email: string
  phone: string
  isCompany: boolean
  company: string
  taxId: string
  /** Nombre de quien recibe; si no se toca, sigue al nombre de contacto. */
  shipName: string
  shipNameTouched: boolean
  line1: string
  line2: string
  postalCode: string
  city: string
  province: string
  note: string
  terms: boolean
  privacy: boolean
  noWithdrawal: boolean
  artworkRights: boolean
}

export const emptyValues: FormValues = {
  name: '',
  email: '',
  phone: '',
  isCompany: false,
  company: '',
  taxId: '',
  shipName: '',
  shipNameTouched: false,
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  province: '',
  note: '',
  terms: false,
  privacy: false,
  noWithdrawal: false,
  artworkRights: false,
}

export type FormErrors = Record<string, string>

export const CONSENT_ERRORS = {
  terms: 'Debes aceptar las condiciones de venta para continuar.',
  privacy: 'Debes confirmar que has leído la política de privacidad.',
  noWithdrawal: 'Necesitamos que confirmes que lo has entendido.',
  artworkRights: 'Necesitamos que confirmes que tienes derecho a usar tus diseños.',
} as const

const noteSchema = z.string().max(500, 'Máximo 500 caracteres')

/** Claves de error de los campos de la dirección: "ship.<campo>" para no chocar con los de contacto. */
const SHIP = 'ship.'

/** Código postal con formato correcto pero fuera de la zona de envío de la tienda. */
export function isUndeliverablePostalCode(value: string): boolean {
  const cp = normalizePostalCode(value)
  return isValidSpanishPostalCode(cp) && !isPostalCodeDeliverable(cp)
}

/** El esquema compartido usa etiquetas cortas como mensaje; aquí se convierten en frases claras. */
const FRIENDLY: Record<string, string> = {
  name: 'Escribe tu nombre y apellidos.',
  'ship.name': 'Escribe el nombre de quien recibe el pedido.',
  'ship.line1': 'Escribe tu dirección (calle y número).',
  'ship.city': 'Escribe tu localidad.',
  'ship.province': 'Elige tu provincia.',
}
const TERSE = new Set(['Nombre y apellidos', 'Dirección', 'Localidad', 'Provincia'])

export function validateForm(v: FormValues): FormErrors {
  const errors = validateRaw(v)
  for (const [key, msg] of Object.entries(errors)) if (TERSE.has(msg) && FRIENDLY[key]) errors[key] = FRIENDLY[key]
  if (errors['ship.postalCode'] === 'Código postal no válido' && !v.postalCode.trim())
    errors['ship.postalCode'] = 'Introduce tu código postal de 5 dígitos.'
  return errors
}

function validateRaw(v: FormValues): FormErrors {
  const errors: FormErrors = {}

  const customer = customerSchema.safeParse(contactOf(v))
  if (!customer.success) Object.assign(errors, fieldErrors(customer.error))
  // Comprar como empresa implica dar los datos de la factura (el servidor exige que vayan juntos).
  if (v.isCompany) {
    if (!v.company.trim()) errors.company = COMPANY_REQUIRED_MESSAGE
    if (!v.taxId.trim()) errors.taxId = TAX_ID_REQUIRED_MESSAGE
  }

  const address = addressSchema.safeParse(addressOf(v))
  if (!address.success) {
    for (const [key, msg] of Object.entries(fieldErrors(address.error))) errors[SHIP + key] = msg
  }

  const note = noteSchema.safeParse(v.note)
  if (!note.success) errors.note = note.error.issues[0].message

  for (const key of ['terms', 'privacy', 'noWithdrawal', 'artworkRights'] as const) {
    if (!v[key]) errors[key] = CONSENT_ERRORS[key]
  }
  return errors
}

const contactOf = (v: FormValues) => ({
  name: v.name,
  email: v.email,
  phone: v.phone,
  company: v.isCompany ? v.company : '',
  taxId: v.isCompany ? v.taxId : '',
})

const addressOf = (v: FormValues) => ({
  name: v.shipName,
  line1: v.line1,
  line2: v.line2,
  postalCode: v.postalCode,
  city: v.city,
  province: v.province,
  country: 'ES' as const,
})

/** Cuerpo de POST /api/checkout. Solo intenciones: el servidor recalcula todos los importes. */
export function buildPayload(v: FormValues, lines: CartLine[]) {
  return {
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      colorId: l.colorId,
      sizes: l.sizes,
      design: l.design,
      previews: l.previews,
      printFiles: l.printFiles,
      note: l.note,
    })),
    customer: contactOf(v),
    shipping: addressOf(v),
    note: v.note,
    consents: { terms: v.terms, privacy: v.privacy, noWithdrawal: v.noWithdrawal, artworkRights: v.artworkRights },
  }
}

/** Traduce las claves de error del servidor ("customer.email", "shipping.line1"…) a las del formulario. */
export function mapServerErrors(errors: Record<string, string> | undefined): FormErrors {
  const out: FormErrors = {}
  for (const [key, msg] of Object.entries(errors ?? {})) {
    if (key.startsWith('customer.')) out[key.slice('customer.'.length)] = msg
    else if (key.startsWith('shipping.')) out[SHIP + key.slice('shipping.'.length)] = msg
    else if (key.startsWith('consents.')) out[key.slice('consents.'.length)] = msg
    else if (key === 'note') out.note = msg
  }
  return out
}
