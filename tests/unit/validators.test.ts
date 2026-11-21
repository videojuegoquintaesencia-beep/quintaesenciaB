import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { quoteFormSchema, todayInMadrid } from '@/lib/quote-form'
import {
  COMPANY_REQUIRED_MESSAGE,
  TAX_ID_REQUIRED_MESSAGE,
  addressSchema,
  contactMessageSchema,
  customerSchema,
  emailSchema,
  fieldErrors,
  firstZodError,
  isValidEmail,
  optionalPhoneSchema,
  phoneSchema,
  postalCodeSchema,
  quoteRequestSchema,
  taxIdSchema,
} from '@/lib/validators'

/** Mensaje de la primera incidencia de un parseo que debe fallar. */
function firstError(schema: z.ZodType, value: unknown): string {
  const result = schema.safeParse(value)
  if (result.success) throw new Error(`Se esperaba un error para ${JSON.stringify(value)}`)
  return firstZodError(result.error)
}

function errorsByField(schema: z.ZodType, value: unknown): Record<string, string> {
  const result = schema.safeParse(value)
  if (result.success) throw new Error(`Se esperaba un error para ${JSON.stringify(value)}`)
  return fieldErrors(result.error)
}

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new Error(`No debería fallar: ${firstZodError(result.error)}`)
  return result.data
}

describe('email', () => {
  it.each(['ana@example.com', 'ana.lopez+tienda@sub.example.co.uk', "o'neil@example.ie", 'a@b.es', 'x_1&2-3@dominio-con-guion.org', 'a@xn--ls8h.xn--p1ai'])(
    'acepta %s',
    (email) => expect(isValidEmail(email)).toBe(true),
  )

  it.each([
    ['comas en la parte local (el servidor de correo lo entregaría a otro)', 'x,otro@dominio.es'],
    ['sin arroba', 'sin-arroba.es'],
    ['dos arrobas', 'a@b@c.es'],
    ['dominio sin punto', 'a@b'],
    ['etiqueta que empieza por guion', 'a@-b.es'],
    ['etiqueta vacía', 'a@b..es'],
    ['TLD de una letra', 'a@b.e'],
    ['TLD numérico', 'a@b.123'],
    ['parte local entrecomillada', '"ana lopez"@x.es'],
    ['mayúsculas (el esquema las convierte antes de validar)', 'Ana@Example.com'],
    ['caracteres no ASCII', 'ñandu@x.es'],
    ['parte local de más de 64 caracteres', `${'a'.repeat(65)}@x.es`],
    ['más de 254 caracteres en total', `${'a'.repeat(60)}@${'b'.repeat(190)}.es`],
    ['vacío', ''],
  ])('rechaza %s', (_name, email) => expect(isValidEmail(email)).toBe(false))

  it('emailSchema recorta espacios y pasa a minúsculas antes de validar', () => {
    expect(parsed(emailSchema, '  Ana@Example.COM ')).toBe('ana@example.com')
    expect(firstError(emailSchema, '')).toBe('Introduce tu email')
    expect(firstError(emailSchema, 'no vale')).toBe('Introduce un email válido')
    expect(firstError(emailSchema, `${'a'.repeat(161)}@x.es`)).toBe('Máximo 160 caracteres')
  })
})

describe('teléfono', () => {
  it('se guarda solo con dígitos y el + inicial', () => {
    expect(parsed(phoneSchema, '600 11 22 33')).toBe('600112233')
    expect(parsed(phoneSchema, '+34 (600) 112-233')).toBe('+34600112233')
    expect(parsed(phoneSchema, '+34.600.112.233')).toBe('+34600112233')
  })

  it('exige entre 9 y 15 dígitos', () => {
    expect(firstError(phoneSchema, '12345678')).toBe('Introduce un teléfono válido (9 a 15 dígitos)')
    expect(firstError(phoneSchema, '1234567890123456')).toBe('Introduce un teléfono válido (9 a 15 dígitos)')
    expect(firstError(phoneSchema, 'seiscientos')).toBe('Introduce un teléfono válido (9 a 15 dígitos)')
    expect(firstError(phoneSchema, '')).toBe('Introduce un teléfono de contacto')
  })

  it('el teléfono opcional admite vacío o ausente, pero no basura', () => {
    expect(parsed(optionalPhoneSchema, '')).toBe('')
    expect(parsed(optionalPhoneSchema, undefined)).toBeUndefined()
    expect(parsed(optionalPhoneSchema, ' 600 112 233 ')).toBe('600112233')
    expect(firstError(optionalPhoneSchema, 'abc')).toBe('Introduce un teléfono válido')
  })
})

describe('código postal', () => {
  it('normaliza espacios y acepta la península y Baleares', () => {
    expect(parsed(postalCodeSchema, ' 28 001 ')).toBe('28001')
    expect(parsed(postalCodeSchema, '07001')).toBe('07001')
  })

  it('rechaza formatos inválidos y zonas a las que no se envía, con mensajes distintos', () => {
    expect(firstError(postalCodeSchema, '2800')).toBe('Código postal no válido')
    expect(firstError(postalCodeSchema, '99999')).toBe('Código postal no válido')
    expect(firstError(postalCodeSchema, 'abcde')).toBe('Código postal no válido')
    expect(firstError(postalCodeSchema, '35001')).toBe('Aún no enviamos a Canarias, Ceuta y Melilla desde la tienda. Escríbenos y lo vemos.')
    expect(firstError(postalCodeSchema, '51001')).toBe('Aún no enviamos a Canarias, Ceuta y Melilla desde la tienda. Escríbenos y lo vemos.')
  })
})

describe('NIF/CIF', () => {
  it('pasa a mayúsculas y admite NIF, NIE y CIF en formato básico', () => {
    expect(parsed(taxIdSchema, 'b12345678')).toBe('B12345678')
    expect(parsed(taxIdSchema, '12345678z')).toBe('12345678Z')
    expect(parsed(taxIdSchema, 'X1234567L')).toBe('X1234567L')
  })

  it('es opcional: vacío o ausente valen', () => {
    expect(parsed(taxIdSchema, '')).toBe('')
    expect(parsed(taxIdSchema, undefined)).toBeUndefined()
  })

  it('rechaza longitudes y formas incorrectas', () => {
    for (const bad of ['1234', 'B1234567', 'B123456789', 'BB2345678', '12345678-Z']) expect(firstError(taxIdSchema, bad), bad).toBe('NIF/CIF no válido')
  })
})

describe('addressSchema', () => {
  const madrid = { name: 'Ana López', line1: 'Calle Mayor 1', postalCode: '28001', city: 'Madrid', province: 'Madrid' }

  it('acepta una dirección completa y pone España por defecto', () => {
    expect(parsed(addressSchema, madrid)).toEqual({ ...madrid, country: 'ES' })
    expect(parsed(addressSchema, { ...madrid, line2: ' 2º A ' }).line2).toBe('2º A')
  })

  it('la provincia debe corresponder al código postal (admite nombres cooficiales y alias)', () => {
    expect(errorsByField(addressSchema, { ...madrid, province: 'Barcelona' })).toEqual({ province: 'La provincia no coincide con el código postal.' })
    expect(addressSchema.safeParse({ ...madrid, postalCode: '07001', city: 'Palma', province: 'Baleares' }).success).toBe(true)
    expect(addressSchema.safeParse({ ...madrid, postalCode: '07001', city: 'Palma', province: 'Illes Balears' }).success).toBe(true)
    expect(addressSchema.safeParse({ ...madrid, postalCode: '15001', city: 'A Coruña', province: 'La Coruña' }).success).toBe(true)
    expect(addressSchema.safeParse({ ...madrid, postalCode: '20001', city: 'Donostia', province: 'Guipúzcoa' }).success).toBe(true)
  })

  it('rechaza provincias inventadas y las zonas sin envío aunque el código postal sea peninsular', () => {
    expect(errorsByField(addressSchema, { ...madrid, province: 'Narnia' })).toEqual({ province: 'Elige una provincia de la lista.' })
    expect(errorsByField(addressSchema, { ...madrid, province: 'Santa Cruz de Tenerife' }).province).toMatch(/Aún no enviamos a Canarias, Ceuta y Melilla/)
    expect(errorsByField(addressSchema, { ...madrid, city: 'Las Palmas de Gran Canaria' }).city).toMatch(/Aún no enviamos a Canarias, Ceuta y Melilla/)
    expect(errorsByField(addressSchema, { ...madrid, city: 'Ceuta' }).city).toMatch(/Aún no enviamos/)
  })

  it('un código postal sin envío falla en el propio código postal', () => {
    expect(errorsByField(addressSchema, { ...madrid, postalCode: '35001', city: 'Las Palmas', province: 'Las Palmas' }).postalCode).toMatch(/Aún no enviamos/)
  })

  it('exige los campos mínimos con sus etiquetas cortas', () => {
    const errors = errorsByField(addressSchema, { name: 'A', line1: 'C/', postalCode: '', city: 'M', province: '' })
    expect(errors).toMatchObject({ name: 'Nombre y apellidos', line1: 'Dirección', postalCode: 'Código postal no válido', city: 'Localidad', province: 'Provincia' })
  })

  it('solo admite España como país', () => {
    expect(addressSchema.safeParse({ ...madrid, country: 'FR' }).success).toBe(false)
  })
})

describe('customerSchema', () => {
  const ana = { name: 'Ana López', email: 'Ana@Example.com', phone: '600 112 233' }

  it('acepta un particular y normaliza email y teléfono', () => {
    expect(parsed(customerSchema, ana)).toEqual({ name: 'Ana López', email: 'ana@example.com', phone: '600112233' })
  })

  it('empresa y NIF/CIF van juntos: falta uno → error en el que falta', () => {
    expect(errorsByField(customerSchema, { ...ana, company: 'Bar Pepe' })).toEqual({ taxId: TAX_ID_REQUIRED_MESSAGE })
    expect(errorsByField(customerSchema, { ...ana, taxId: 'B12345678' })).toEqual({ company: COMPANY_REQUIRED_MESSAGE })
    expect(parsed(customerSchema, { ...ana, company: 'Bar Pepe', taxId: 'b12345678' })).toMatchObject({ company: 'Bar Pepe', taxId: 'B12345678' })
  })

  it('cadenas vacías equivalen a no comprar como empresa', () => {
    expect(customerSchema.safeParse({ ...ana, company: '', taxId: '' }).success).toBe(true)
  })

  it('un NIF/CIF con formato incorrecto se rechaza aunque haya empresa', () => {
    expect(errorsByField(customerSchema, { ...ana, company: 'Bar Pepe', taxId: '123' })).toEqual({ taxId: 'NIF/CIF no válido' })
  })

  it('el nombre necesita al menos dos caracteres', () => {
    expect(errorsByField(customerSchema, { ...ana, name: 'A' })).toEqual({ name: 'Nombre y apellidos' })
  })
})

describe('contactMessageSchema', () => {
  const message = { name: 'Lucía', email: 'lucia@example.com', message: 'Quería saber si hacéis bolsas de tela.', consent: true }

  it('acepta un mensaje válido con teléfono opcional y campo trampa vacío', () => {
    expect(contactMessageSchema.safeParse({ ...message, phone: '', website: '' }).success).toBe(true)
    expect(contactMessageSchema.safeParse(message).success).toBe(true)
  })

  it('exige consentimiento, nombre y un mensaje de al menos 10 caracteres', () => {
    expect(errorsByField(contactMessageSchema, { ...message, consent: false }).consent).toBe('Debes aceptar la política de privacidad')
    expect(errorsByField(contactMessageSchema, { ...message, message: 'Hola' }).message).toBe('Cuéntanos en qué podemos ayudarte (mínimo 10 caracteres)')
    expect(errorsByField(contactMessageSchema, { ...message, name: 'L' }).name).toBe('Dinos tu nombre')
  })

  it('el campo trampa (honeypot) relleno no pasa la validación', () => {
    expect(contactMessageSchema.safeParse({ ...message, website: 'http://spam.example' }).success).toBe(false)
  })
})

describe('quoteRequestSchema y quoteFormSchema', () => {
  const quote = {
    name: 'Lorena Prieto',
    email: 'lorena@example.com',
    products: ['camiseta', 'gorra'],
    quantity: '80',
    message: 'Queremos uniformar al equipo con nuestro logo.',
    consent: true,
  }

  it('acepta una solicitud válida, convierte las unidades a número y pone fileIds por defecto', () => {
    const data = parsed(quoteRequestSchema, quote)
    expect(data.quantity).toBe(80)
    expect(data.fileIds).toEqual([])
    expect(data.deadline).toBeUndefined()
    expect(parsed(quoteRequestSchema, { ...quote, deadline: '' }).deadline).toBe('')
  })

  it('exige al menos un producto de la lista y unas unidades', () => {
    expect(errorsByField(quoteRequestSchema, { ...quote, products: [] }).products).toBe('Elige al menos un producto')
    expect(quoteRequestSchema.safeParse({ ...quote, products: ['bolsa'] }).success).toBe(false)
    expect(errorsByField(quoteRequestSchema, { ...quote, quantity: '0' }).quantity).toBe('Indica unas unidades aproximadas')
    expect(quoteRequestSchema.safeParse({ ...quote, quantity: 'muchas' }).success).toBe(false)
  })

  it('la fecha debe tener formato AAAA-MM-DD; el formulario además exige que sea real y futura', () => {
    expect(errorsByField(quoteRequestSchema, { ...quote, deadline: '20/12/2026' }).deadline).toBe('Fecha no válida')
    expect(quoteRequestSchema.safeParse({ ...quote, deadline: '2026-13-45' }).success).toBe(true) // solo forma, no calendario
    expect(errorsByField(quoteFormSchema, { ...quote, deadline: '2026-02-30' }).deadline).toBe('Elige una fecha de hoy en adelante')
    expect(errorsByField(quoteFormSchema, { ...quote, deadline: '2020-01-01' }).deadline).toBe('Elige una fecha de hoy en adelante')
    expect(quoteFormSchema.safeParse({ ...quote, deadline: todayInMadrid() }).success).toBe(true)
  })

  it('los adjuntos son como mucho 5 ids con el formato de newId', () => {
    expect(quoteRequestSchema.safeParse({ ...quote, fileIds: ['abcdefghijkl'] }).success).toBe(true)
    expect(quoteRequestSchema.safeParse({ ...quote, fileIds: ['NO-VALE'] }).success).toBe(false)
    expect(quoteRequestSchema.safeParse({ ...quote, fileIds: Array.from({ length: 6 }, (_, i) => `abcdefghijk${i}`) }).success).toBe(false)
  })

  it('el campo trampa relleno no pasa la validación', () => {
    expect(quoteRequestSchema.safeParse({ ...quote, website: 'x' }).success).toBe(false)
  })
})

describe('firstZodError y fieldErrors', () => {
  const schema = z.object({ shipping: z.object({ postalCode: z.string().min(5, 'CP corto'), city: z.string().min(1, 'Ciudad') }), note: z.string().max(2, 'Nota larga') })

  it('fieldErrors agrupa por ruta con puntos y conserva el primer mensaje de cada campo', () => {
    const result = schema.safeParse({ shipping: { postalCode: '1', city: '' }, note: 'xxx' })
    if (result.success) throw new Error('debía fallar')
    expect(fieldErrors(result.error)).toEqual({ 'shipping.postalCode': 'CP corto', 'shipping.city': 'Ciudad', note: 'Nota larga' })
    expect(firstZodError(result.error)).toBe('CP corto')
  })

  it('un error en la raíz se guarda con la clave "_"', () => {
    const root = z.string().refine(() => false, 'Nada vale')
    const result = root.safeParse('x')
    if (result.success) throw new Error('debía fallar')
    expect(fieldErrors(result.error)).toEqual({ _: 'Nada vale' })
  })
})
