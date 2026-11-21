import { describe, expect, it } from 'vitest'
import { PRODUCTS, QUANTITY_DISCOUNTS, getProduct } from '@/config/products'
import { site } from '@/config/site'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SECTIONS,
  applyProductPricing,
  catalogFromSettings,
  defaultSettings,
  isSettingsSection,
  mergeSettings,
  pricingSchema,
  type ProductPricing,
} from '@/lib/settings-schema'

const camisetaPricing = (): ProductPricing => structuredClone(DEFAULT_SETTINGS.pricing.products.camiseta!)

/** Mensajes de todas las incidencias de un parseo fallido. */
function issues(value: unknown): string[] {
  const result = pricingSchema.safeParse(value)
  if (result.success) throw new Error('Se esperaba que el esquema rechazara el valor')
  return result.error.issues.map((i) => i.message)
}

describe('defaultSettings', () => {
  it('equivale a la configuración en código (site y PRODUCTS)', () => {
    const s = defaultSettings()
    expect(s.business).toEqual(site.business)
    expect(s.contact).toEqual(site.contact)
    expect(s.shipping).toEqual(site.shipping)
    expect(s.production).toEqual(site.production)
    expect(s.pricing.quantityDiscounts).toEqual(QUANTITY_DISCOUNTS)
    expect(Object.keys(s.pricing.products).sort()).toEqual(PRODUCTS.map((p) => p.id).sort())
    for (const product of PRODUCTS) {
      const pricing = s.pricing.products[product.id]!
      expect(pricing.basePriceCents).toBe(product.basePriceCents)
      expect(pricing.printTiers).toEqual(product.printTiers)
      expect(pricing.sizeSurchargesCents).toEqual(product.sizeSurchargesCents ?? {})
      expect(pricing.maxQtyPerLine).toBe(product.maxQtyPerLine)
    }
    // Solo los colores con suplemento aparecen (las tazas de interior de color)
    expect(s.pricing.products.camiseta!.colorSurchargesCents).toEqual({})
    expect(s.pricing.products.taza!.colorSurchargesCents).toEqual({ rosa: 150, azul: 150, amarillo: 150, negro: 150 })
  })

  it('devuelve copias independientes (mutar una no afecta a DEFAULT_SETTINGS)', () => {
    const s = defaultSettings()
    s.shipping.excludedPostalPrefixes.push('99')
    s.pricing.products.camiseta!.basePriceCents = 1
    s.pricing.quantityDiscounts[0].pct = 99
    expect(DEFAULT_SETTINGS.shipping.excludedPostalPrefixes).toEqual(['35', '38', '51', '52'])
    expect(DEFAULT_SETTINGS.pricing.products.camiseta!.basePriceCents).toBe(890)
    expect(DEFAULT_SETTINGS.pricing.quantityDiscounts[0].pct).toBe(0)
  })

  it('isSettingsSection reconoce solo las secciones conocidas', () => {
    for (const s of SETTINGS_SECTIONS) expect(isSettingsSection(s)).toBe(true)
    expect(isSettingsSection('precios')).toBe(false)
    expect(isSettingsSection(42)).toBe(false)
    expect(isSettingsSection(undefined)).toBe(false)
  })
})

describe('mergeSettings', () => {
  it('sin nada guardado devuelve los valores por defecto y ninguna sección inválida', () => {
    const { settings, invalid } = mergeSettings({})
    expect(settings).toEqual(defaultSettings())
    expect(invalid).toEqual([])
  })

  it('una sección parcial (guardada por una versión anterior) se completa con los valores por defecto', () => {
    const { settings, invalid } = mergeSettings({ shipping: { flatCents: 300 }, contact: { phone: '600 000 000' } })
    expect(invalid).toEqual([])
    expect(settings.shipping).toEqual({ ...site.shipping, flatCents: 300 })
    expect(settings.contact).toEqual({ ...site.contact, phone: '600 000 000' })
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['un importe negativo en envíos', { shipping: { flatCents: -1 } }, 'shipping'],
    ['un prefijo postal que no son dos dígitos', { shipping: { excludedPostalPrefixes: ['351'] } }, 'shipping'],
    ['un email mal formado en contacto', { contact: { email: 'no-es-un-email' } }, 'contact'],
    ['un WhatsApp con el símbolo +', { contact: { whatsapp: '+34600000000' } }, 'contact'],
    ['un texto con saltos de línea en el titular', { business: { legalName: 'Una\nDos' } }, 'business'],
    ['algo que no es un objeto', { business: 'texto' }, 'business'],
    ['un plazo máximo menor que el mínimo', { production: { leadDaysMin: 5, leadDaysMax: 2 } }, 'production'],
    ['plazos incompletos (esta sección exige los dos campos)', { production: { leadDaysMin: 1 } }, 'production'],
    ['precios sin descuentos por cantidad', { pricing: { products: {}, quantityDiscounts: [] } }, 'pricing'],
  ])('ignora una sección inválida (%s), la señala y usa los valores por defecto', (_name, overrides, section) => {
    const { settings, invalid } = mergeSettings(overrides)
    expect(invalid).toEqual([section])
    expect(settings).toEqual(defaultSettings())
  })

  it('varias secciones inválidas se señalan todas; las válidas se aplican igualmente', () => {
    const { settings, invalid } = mergeSettings({ shipping: { flatCents: -1 }, contact: { email: 'x' }, production: { leadDaysMin: 1, leadDaysMax: 3 } })
    expect(invalid).toEqual(['contact', 'shipping'])
    expect(settings.production).toEqual({ leadDaysMin: 1, leadDaysMax: 3 })
  })

  it('en precios solo se sustituyen los productos guardados y la tabla de descuentos', () => {
    const camiseta = camisetaPricing()
    camiseta.basePriceCents = 1000
    const { settings, invalid } = mergeSettings({ pricing: { products: { camiseta }, quantityDiscounts: [{ minQty: 1, pct: 0 }, { minQty: 2, pct: 10 }] } })
    expect(invalid).toEqual([])
    expect(settings.pricing.products.camiseta!.basePriceCents).toBe(1000)
    expect(settings.pricing.products.taza).toEqual(DEFAULT_SETTINGS.pricing.products.taza)
    expect(settings.pricing.quantityDiscounts).toEqual([{ minQty: 1, pct: 0 }, { minQty: 2, pct: 10 }])
  })

  it('las claves desconocidas se ignoran sin marcar nada como inválido', () => {
    const { invalid } = mergeSettings({ loquesea: { a: 1 } } as Record<string, unknown>)
    expect(invalid).toEqual([])
  })
})

describe('pricingSchema', () => {
  const valid = () => ({ products: { camiseta: camisetaPricing() }, quantityDiscounts: QUANTITY_DISCOUNTS })

  it('acepta los precios por defecto de todos los productos', () => {
    expect(pricingSchema.safeParse(DEFAULT_SETTINGS.pricing).success).toBe(true)
    expect(pricingSchema.safeParse(valid()).success).toBe(true)
  })

  it('rechaza una talla que el producto no tiene', () => {
    const value = valid()
    value.products.camiseta.sizeSurchargesCents = { XXXL: 100 }
    const result = pricingSchema.safeParse(value)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Talla desconocida en Camiseta: XXXL')
      expect(result.error.issues[0].path).toEqual(['products', 'camiseta', 'sizeSurchargesCents'])
    }
  })

  it('rechaza un color que el producto no tiene', () => {
    const value = valid()
    value.products.camiseta.colorSurchargesCents = { fucsia: 10 }
    expect(issues(value)).toContain('Color desconocido en Camiseta: fucsia')
  })

  it('rechaza una zona de estampado que el producto no tiene', () => {
    const value = valid()
    value.products.camiseta.printTiers.manga = [{ upToCm2: 50, cents: 100 }]
    expect(issues(value)).toContain('Zona desconocida en Camiseta: manga')
  })

  it('exige escalones ordenados de menor a mayor superficie, al menos uno y como mucho ocho', () => {
    const desordenado = valid()
    desordenado.products.camiseta.printTiers.frente = [{ upToCm2: 250, cents: 400 }, { upToCm2: 100, cents: 250 }]
    expect(issues(desordenado)).toContain('Los escalones deben ir de menor a mayor superficie')

    const repetido = valid()
    repetido.products.camiseta.printTiers.frente = [{ upToCm2: 100, cents: 400 }, { upToCm2: 100, cents: 250 }]
    expect(issues(repetido)).toContain('Los escalones deben ir de menor a mayor superficie')

    const vacio = valid()
    vacio.products.camiseta.printTiers.frente = []
    expect(issues(vacio)).toContain('Hace falta al menos un escalón')

    const demasiados = valid()
    demasiados.products.camiseta.printTiers.frente = Array.from({ length: 9 }, (_, i) => ({ upToCm2: (i + 1) * 100, cents: 100 }))
    expect(issues(demasiados)).toContain('Máximo 8 escalones')
  })

  it('exige descuentos ordenados por unidades crecientes', () => {
    const value = { ...valid(), quantityDiscounts: [{ minQty: 10, pct: 10 }, { minQty: 5, pct: 5 }] }
    expect(issues(value)).toContain('Los descuentos deben ir de menos a más unidades')
  })

  it('rechaza productos que no existen, importes negativos y topes de unidades absurdos', () => {
    expect(pricingSchema.safeParse({ ...valid(), products: { bolsa: camisetaPricing() } }).success).toBe(false)
    const negativo = valid()
    negativo.products.camiseta.basePriceCents = -5
    expect(pricingSchema.safeParse(negativo).success).toBe(false)
    const tope = valid()
    tope.products.camiseta.maxQtyPerLine = 0
    expect(pricingSchema.safeParse(tope).success).toBe(false)
  })
})

describe('applyProductPricing', () => {
  const taza = getProduct('taza')!

  it('sin precios devuelve el mismo producto', () => {
    expect(applyProductPricing(taza, undefined)).toBe(taza)
  })

  it('aplica base, suplementos, escalones y tope sin tocar el resto del producto', () => {
    const pricing: ProductPricing = {
      basePriceCents: 600,
      sizeSurchargesCents: {},
      colorSurchargesCents: { rosa: 200 },
      printTiers: { envolvente: [{ upToCm2: 170, cents: 500 }], manga: [{ upToCm2: 10, cents: 1 }] },
      maxQtyPerLine: 50,
    }
    const result = applyProductPricing(taza, pricing)
    expect(result.basePriceCents).toBe(600)
    expect(result.maxQtyPerLine).toBe(50)
    expect(result.colors.find((c) => c.id === 'rosa')!.surchargeCents).toBe(200)
    // Los colores sin suplemento guardado lo pierden (aunque en código lo tuvieran)
    expect(result.colors.find((c) => c.id === 'azul')!.surchargeCents).toBeUndefined()
    expect(result.printTiers).toEqual({ envolvente: [{ upToCm2: 170, cents: 500 }] }) // la zona desconocida no se añade
    expect(result.views).toBe(taza.views)
    expect(result.name).toBe(taza.name)
    // El producto original no se modifica
    expect(taza.basePriceCents).toBe(490)
    expect(taza.colors.find((c) => c.id === 'azul')!.surchargeCents).toBe(150)
  })

  it('una zona sin escalones guardados conserva los escalones en código', () => {
    const camiseta = getProduct('camiseta')!
    const pricing = camisetaPricing()
    delete pricing.printTiers.pecho
    const result = applyProductPricing(camiseta, pricing)
    expect(result.printTiers.pecho).toEqual(camiseta.printTiers.pecho)
    expect(result.printTiers.pecho).not.toBe(camiseta.printTiers.pecho) // copia, no la misma referencia
  })
})

describe('catalogFromSettings', () => {
  it('devuelve copias: modificar el catálogo no altera los ajustes de origen', () => {
    const settings = defaultSettings()
    const catalog = catalogFromSettings(settings)
    catalog.shipping.excludedPostalPrefixes.push('99')
    catalog.quantityDiscounts[0].pct = 50
    catalog.production.leadDaysMax = 99
    expect(settings.shipping.excludedPostalPrefixes).toEqual(['35', '38', '51', '52'])
    expect(settings.pricing.quantityDiscounts[0].pct).toBe(0)
    expect(settings.production.leadDaysMax).toBe(site.production.leadDaysMax)
    expect(catalog.vatRate).toBe(site.vatRate)
    expect(catalog.b2b).toEqual(site.b2b)
  })
})
