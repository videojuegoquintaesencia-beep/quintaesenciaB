/**
 * Ajustes del negocio editables desde el panel: datos del titular, contacto, envíos, plazos y precios.
 *
 * Es código PURO (vale en el navegador y en el servidor): lo usan los formularios del panel, el catálogo
 * efectivo que recibe el cliente y el servidor. Los valores por defecto salen de `src/config/site.ts` y
 * `src/config/products.ts`; lo que guarda el panel en la tabla `settings` se superpone sección a sección.
 * El acceso a la base de datos está en `./settings.ts` (solo servidor).
 */
import { z } from 'zod'
import '@/lib/zod-es'
import { site } from '@/config/site'
import { PRODUCTS, QUANTITY_DISCOUNTS, allAreas, type Product, type ProductId, type QuantityDiscount } from '@/config/products'

export const SETTINGS_SECTIONS = ['business', 'contact', 'shipping', 'production', 'pricing'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export const SETTINGS_SECTION_LABEL: Record<SettingsSection, string> = {
  business: 'Datos del titular',
  contact: 'Contacto y redes',
  shipping: 'Envíos',
  production: 'Plazos de producción',
  pricing: 'Precios y descuentos',
}

export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

/* ───────────── Esquemas (validación de lo que guarda el panel) ───────────── */

const noLineBreaks = (value: string) => !/[\r\n\u0000]/.test(value)
const line = (max: number) => z.string().trim().max(max).refine(noLineBreaks, 'No puede tener saltos de línea')
const cents = (max: number) => z.number().int().min(0).max(max)

export const businessSchema = z.object({
  legalName: line(200),
  taxId: line(40),
  registeredAddress: line(300),
  registry: line(300),
  processors: z.string().trim().max(2000),
})

export const contactSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Email no válido'),
  phone: line(40),
  /** Solo dígitos con prefijo de país, sin "+" (formato wa.me). Vacío = sin botón de WhatsApp. */
  whatsapp: z.string().trim().max(20).regex(/^\d*$/, 'Solo dígitos, con el prefijo del país y sin "+"'),
  instagram: line(80),
  tiktok: line(80),
  address: line(300),
  hours: line(120),
})

export const shippingSchema = z.object({
  flatCents: cents(100_000),
  freeFromCents: cents(10_000_000),
  balearesExtraCents: cents(100_000),
  excludedPostalPrefixes: z.array(z.string().regex(/^\d{2}$/, 'Dos dígitos')).max(60),
  excludedZonesLabel: line(120),
  carrierLabel: line(80),
  deliveryZonesLabel: line(120),
})

export const productionSchema = z
  .object({
    leadDaysMin: z.number().int().min(0).max(60),
    leadDaysMax: z.number().int().min(0).max(90),
  })
  .refine((v) => v.leadDaysMax >= v.leadDaysMin, { message: 'El plazo máximo no puede ser menor que el mínimo', path: ['leadDaysMax'] })

const tierSchema = z.object({
  upToCm2: z.number().min(1).max(10_000),
  cents: cents(100_000),
})

const tiersSchema = z
  .array(tierSchema)
  .min(1, 'Hace falta al menos un escalón')
  .max(8, 'Máximo 8 escalones')
  .refine((tiers) => tiers.every((t, i) => i === 0 || t.upToCm2 > tiers[i - 1].upToCm2), 'Los escalones deben ir de menor a mayor superficie')

export const productPricingSchema = z.object({
  basePriceCents: cents(1_000_000),
  /** id de talla → suplemento por unidad. */
  sizeSurchargesCents: z.record(z.string().max(20), cents(100_000)),
  /** id de color → suplemento por unidad. */
  colorSurchargesCents: z.record(z.string().max(40), cents(100_000)),
  /** id de zona → escalones de precio por superficie usada. */
  printTiers: z.record(z.string().max(40), tiersSchema),
  maxQtyPerLine: z.number().int().min(1).max(10_000),
})

export const PRODUCT_IDS = PRODUCTS.map((p) => p.id) as [ProductId, ...ProductId[]]

export const pricingSchema = z
  .object({
    products: z.partialRecord(z.enum(PRODUCT_IDS), productPricingSchema),
    quantityDiscounts: z
      .array(z.object({ minQty: z.number().int().min(1).max(100_000), pct: z.number().min(0).max(90) }))
      .min(1)
      .max(10)
      .refine((d) => d.every((x, i) => i === 0 || x.minQty > d[i - 1].minQty), 'Los descuentos deben ir de menos a más unidades'),
  })
  .superRefine((value, ctx) => {
    for (const [productId, pricing] of Object.entries(value.products)) {
      const product = PRODUCTS.find((p) => p.id === productId)
      if (!product || !pricing) continue
      const sizes = new Set(product.sizes.map((s) => s.id))
      const colors = new Set(product.colors.map((c) => c.id))
      const areas = new Set(allAreas(product).map((a) => a.id))
      for (const sizeId of Object.keys(pricing.sizeSurchargesCents))
        if (!sizes.has(sizeId)) ctx.addIssue({ code: 'custom', message: `Talla desconocida en ${product.name}: ${sizeId}`, path: ['products', productId, 'sizeSurchargesCents'] })
      for (const colorId of Object.keys(pricing.colorSurchargesCents))
        if (!colors.has(colorId)) ctx.addIssue({ code: 'custom', message: `Color desconocido en ${product.name}: ${colorId}`, path: ['products', productId, 'colorSurchargesCents'] })
      for (const areaId of Object.keys(pricing.printTiers))
        if (!areas.has(areaId)) ctx.addIssue({ code: 'custom', message: `Zona desconocida en ${product.name}: ${areaId}`, path: ['products', productId, 'printTiers'] })
    }
  })

export const SECTION_SCHEMAS = {
  business: businessSchema,
  contact: contactSchema,
  shipping: shippingSchema,
  production: productionSchema,
  pricing: pricingSchema,
} as const

export type BusinessSettings = z.infer<typeof businessSchema>
export type ContactSettings = z.infer<typeof contactSchema>
export type ShippingSettings = z.infer<typeof shippingSchema>
export type ProductionSettings = z.infer<typeof productionSchema>
export type ProductPricing = z.infer<typeof productPricingSchema>
export type PricingSettings = z.infer<typeof pricingSchema>

/** Ajustes efectivos (valores por defecto + lo guardado en el panel). */
export interface Settings {
  business: BusinessSettings
  contact: ContactSettings
  shipping: ShippingSettings
  production: ProductionSettings
  pricing: PricingSettings
}

/* ───────────── Valores por defecto (desde la configuración en código) ───────────── */

function clonePricing(product: Product): ProductPricing {
  return {
    basePriceCents: product.basePriceCents,
    sizeSurchargesCents: { ...(product.sizeSurchargesCents ?? {}) },
    colorSurchargesCents: Object.fromEntries(product.colors.filter((c) => (c.surchargeCents ?? 0) > 0).map((c) => [c.id, c.surchargeCents ?? 0])),
    printTiers: Object.fromEntries(Object.entries(product.printTiers).map(([areaId, tiers]) => [areaId, tiers.map((t) => ({ ...t }))])),
    maxQtyPerLine: product.maxQtyPerLine,
  }
}

export function defaultSettings(): Settings {
  return {
    business: { ...site.business },
    contact: { ...site.contact },
    shipping: { ...site.shipping, excludedPostalPrefixes: [...site.shipping.excludedPostalPrefixes] },
    production: { ...site.production },
    pricing: {
      products: Object.fromEntries(PRODUCTS.map((p) => [p.id, clonePricing(p)])),
      quantityDiscounts: QUANTITY_DISCOUNTS.map((d) => ({ ...d })),
    },
  }
}

export const DEFAULT_SETTINGS: Settings = defaultSettings()

/* ───────────── Mezcla de lo guardado con los valores por defecto ───────────── */

export interface MergeResult {
  settings: Settings
  /** Secciones guardadas que no pasaron la validación (se ignoran y se usan los valores por defecto). */
  invalid: SettingsSection[]
}

/**
 * Superpone lo guardado (por sección, ya parseado de JSON) sobre los valores por defecto. Es tolerante con
 * secciones guardadas por una versión anterior a la que le falten campos: se completan con los defectos.
 */
export function mergeSettings(overrides: Partial<Record<SettingsSection, unknown>>): MergeResult {
  const out = defaultSettings()
  const invalid: SettingsSection[] = []

  const business = businessSchema.partial().safeParse(overrides.business ?? {})
  if (business.success) Object.assign(out.business, stripUndefined(business.data))
  else if (overrides.business !== undefined) invalid.push('business')

  const contact = contactSchema.partial().safeParse(overrides.contact ?? {})
  if (contact.success) Object.assign(out.contact, stripUndefined(contact.data))
  else if (overrides.contact !== undefined) invalid.push('contact')

  const shipping = shippingSchema.partial().safeParse(overrides.shipping ?? {})
  if (shipping.success) Object.assign(out.shipping, stripUndefined(shipping.data))
  else if (overrides.shipping !== undefined) invalid.push('shipping')

  const production = productionSchema.safeParse(overrides.production ?? out.production)
  if (production.success) out.production = production.data
  else if (overrides.production !== undefined) invalid.push('production')

  if (overrides.pricing !== undefined) {
    const pricing = pricingSchema.safeParse(overrides.pricing)
    if (pricing.success) {
      for (const [productId, saved] of Object.entries(pricing.data.products)) {
        if (saved && out.pricing.products[productId as ProductId]) out.pricing.products[productId as ProductId] = saved
      }
      out.pricing.quantityDiscounts = pricing.data.quantityDiscounts
    } else invalid.push('pricing')
  }

  return { settings: out, invalid }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

/* ───────────── Catálogo efectivo (productos con los precios aplicados) ───────────── */

/**
 * Lo que necesita el cálculo de precios y los textos de envío/plazos. En el servidor sale de `getCatalog()`
 * (./settings.ts); en el navegador llega desde una página de servidor (contexto). `DEFAULT_CATALOG` son los
 * precios en código, para pruebas y como valor por defecto de las funciones de `lib/pricing`.
 */
export interface Catalog {
  products: Product[]
  quantityDiscounts: QuantityDiscount[]
  shipping: ShippingSettings
  production: ProductionSettings
  vatRate: number
  b2b: { quoteFromUnits: number }
}

/** Producto con los precios de `pricing` aplicados (el resto del producto —vistas, zonas, textos— no cambia). */
export function applyProductPricing(product: Product, pricing: ProductPricing | undefined): Product {
  if (!pricing) return product
  return {
    ...product,
    basePriceCents: pricing.basePriceCents,
    sizeSurchargesCents: { ...pricing.sizeSurchargesCents },
    colors: product.colors.map((c) => {
      const surcharge = pricing.colorSurchargesCents[c.id] ?? 0
      const { surchargeCents: _ignored, ...rest } = c
      void _ignored
      return surcharge > 0 ? { ...rest, surchargeCents: surcharge } : rest
    }),
    printTiers: Object.fromEntries(
      Object.entries(product.printTiers).map(([areaId, tiers]) => [areaId, (pricing.printTiers[areaId] ?? tiers).map((t) => ({ ...t }))]),
    ),
    maxQtyPerLine: pricing.maxQtyPerLine,
  }
}

export function catalogFromSettings(settings: Settings): Catalog {
  return {
    products: PRODUCTS.map((p) => applyProductPricing(p, settings.pricing.products[p.id])),
    quantityDiscounts: settings.pricing.quantityDiscounts.map((d) => ({ ...d })),
    shipping: { ...settings.shipping, excludedPostalPrefixes: [...settings.shipping.excludedPostalPrefixes] },
    production: { ...settings.production },
    vatRate: site.vatRate,
    b2b: { ...site.b2b },
  }
}

export const DEFAULT_CATALOG: Catalog = catalogFromSettings(DEFAULT_SETTINGS)

export function catalogProduct(catalog: Catalog, id: string): Product | undefined {
  return catalog.products.find((p) => p.id === id)
}

export function catalogProductBySlug(catalog: Catalog, slug: string): Product | undefined {
  return catalog.products.find((p) => p.slug === slug)
}
