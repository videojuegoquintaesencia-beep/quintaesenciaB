/**
 * Cálculo de precios. Es código puro y compartido: el editor lo usa para mostrar el precio en vivo
 * y el servidor lo vuelve a calcular al crear el pedido (el precio del cliente NUNCA se acepta tal cual).
 * Todos los importes en céntimos de euro, IVA incluido.
 */
import { site } from '@/config/site'
import {
  QUANTITY_DISCOUNTS,
  getArea,
  getColor,
  getProduct,
  type PrintTier,
  type Product,
} from '@/config/products'
import { areaUsage, parseDesign, type Design } from './design'

export interface PrintCharge {
  areaId: string
  label: string
  usedCm2: number
  /** Precio del estampado de esta zona, por unidad. */
  cents: number
}

export interface LinePrice {
  ok: true
  /** Unidades totales de la línea. */
  quantity: number
  /** Prenda/producto + suplemento de color, por unidad (sin estampado ni suplemento de talla). */
  unitBaseCents: number
  /** Suma de los estampados por unidad. */
  printCents: number
  prints: PrintCharge[]
  /** Suplementos de talla acumulados de TODAS las unidades. */
  sizeSurchargeCents: number
  /** Importe antes de descuento: unidades × (base + estampado) + suplementos de talla. */
  grossCents: number
  discountPct: number
  discountCents: number
  /** Importe final de la línea. */
  totalCents: number
  /** Precio medio por unidad tras descuento (redondeado). */
  avgUnitCents: number
}

export interface PriceError {
  ok: false
  error: string
}

export interface LineInput {
  productId: string
  colorId: string
  sizes: Record<string, number>
  design: Design
}

export function tierPrice(tiers: PrintTier[] | undefined, usedCm2: number): number {
  if (!tiers || tiers.length === 0 || usedCm2 <= 0) return 0
  // pequeña tolerancia para errores de redondeo en el límite del escalón
  const tier = tiers.find((t) => usedCm2 <= t.upToCm2 + 0.01) ?? tiers[tiers.length - 1]
  return tier.cents
}

export function quantityDiscountPct(quantity: number): number {
  let pct = 0
  for (const d of QUANTITY_DISCOUNTS) if (quantity >= d.minQty) pct = d.pct
  return pct
}

export function totalQuantity(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((n, q) => n + (Number.isFinite(q) ? q : 0), 0)
}

/** Precio por unidad (sin descuento) de un producto con un diseño: base + color + estampados. */
export function unitPriceCents(product: Product, colorId: string, design: Design): number {
  const color = getColor(product, colorId)
  const prints = printCharges(product, design)
  return product.basePriceCents + (color?.surchargeCents ?? 0) + prints.reduce((n, p) => n + p.cents, 0)
}

export function printCharges(product: Product, design: Design): PrintCharge[] {
  const out: PrintCharge[] = []
  for (const [areaId, data] of Object.entries(design.areas)) {
    const area = getArea(product, areaId)
    if (!area) continue
    const { usedCm2 } = areaUsage(data.layers, area)
    if (usedCm2 <= 0) continue
    out.push({ areaId, label: area.label, usedCm2, cents: tierPrice(product.printTiers[areaId], usedCm2) })
  }
  return out
}

export function priceLine(input: LineInput): LinePrice | PriceError {
  const product = getProduct(input.productId)
  if (!product) return { ok: false, error: 'Producto desconocido.' }
  const color = getColor(product, input.colorId)
  if (!color) return { ok: false, error: 'Color no disponible.' }

  const checked = parseDesign(input.design)
  if (!checked.ok) return checked
  const design = checked.design
  if (design.productId !== product.id || design.colorId !== color.id)
    return { ok: false, error: 'El diseño no coincide con el producto o el color elegidos.' }

  // Tallas y cantidades
  const validSizes = new Set(product.sizes.map((s) => s.id))
  let quantity = 0
  let sizeSurchargeCents = 0
  for (const [sizeId, qty] of Object.entries(input.sizes)) {
    if (!validSizes.has(sizeId)) return { ok: false, error: `Talla no válida: ${sizeId}.` }
    if (!Number.isInteger(qty) || qty < 0) return { ok: false, error: 'Cantidad no válida.' }
    quantity += qty
    sizeSurchargeCents += qty * (product.sizeSurchargesCents?.[sizeId] ?? 0)
  }
  if (quantity < 1) return { ok: false, error: 'Elige al menos una unidad.' }
  if (quantity > product.maxQtyPerLine)
    return {
      ok: false,
      error: `Para más de ${product.maxQtyPerLine} unidades de este producto pídenos presupuesto.`,
    }

  const prints = printCharges(product, design)
  if (prints.length === 0) return { ok: false, error: 'Añade al menos un elemento de diseño dentro de la zona de estampado.' }

  const unitBaseCents = product.basePriceCents + (color.surchargeCents ?? 0)
  const printCents = prints.reduce((n, p) => n + p.cents, 0)
  const grossCents = quantity * (unitBaseCents + printCents) + sizeSurchargeCents
  const discountPct = quantityDiscountPct(quantity)
  const discountCents = Math.round((grossCents * discountPct) / 100)
  const totalCents = grossCents - discountCents

  return {
    ok: true,
    quantity,
    unitBaseCents,
    printCents,
    prints,
    sizeSurchargeCents,
    grossCents,
    discountPct,
    discountCents,
    totalCents,
    avgUnitCents: Math.round(totalCents / quantity),
  }
}

/* ───────────── Envío, IVA y totales de carrito ───────────── */

export function normalizePostalCode(value: string): string {
  return value.replace(/\s/g, '')
}

export function isValidSpanishPostalCode(value: string): boolean {
  return /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(normalizePostalCode(value))
}

/** ¿Enviamos a este código postal desde la tienda online? */
export function isPostalCodeDeliverable(postalCode: string): boolean {
  const cp = normalizePostalCode(postalCode)
  if (!isValidSpanishPostalCode(cp)) return false
  return !(site.shipping.excludedPostalPrefixes as readonly string[]).includes(cp.slice(0, 2))
}

/** Coste de envío en céntimos; `null` si no se envía a ese código postal. Sin CP, se estima el envío peninsular. */
export function computeShippingCents(subtotalCents: number, postalCode?: string): number | null {
  const cp = postalCode ? normalizePostalCode(postalCode) : ''
  if (cp) {
    if (!isPostalCodeDeliverable(cp)) return null
  }
  if (subtotalCents >= site.shipping.freeFromCents) return 0
  let cents: number = site.shipping.flatCents
  if (cp.startsWith('07')) cents += site.shipping.balearesExtraCents
  return cents
}

/** Parte del total que corresponde a IVA (los precios ya lo incluyen). */
export function vatIncludedCents(totalCents: number): number {
  return Math.round(totalCents - totalCents / (1 + site.vatRate))
}

export interface CartTotals {
  subtotalCents: number
  /** null si no se puede enviar al código postal indicado. */
  shippingCents: number | null
  totalCents: number
  vatCents: number
  /** Lo que falta para el envío gratis (0 si ya aplica). */
  freeShippingRemainingCents: number
}

export function computeCartTotals(lineTotalsCents: number[], postalCode?: string): CartTotals {
  const subtotalCents = lineTotalsCents.reduce((n, c) => n + c, 0)
  const shippingCents = computeShippingCents(subtotalCents, postalCode)
  const totalCents = subtotalCents + (shippingCents ?? 0)
  return {
    subtotalCents,
    shippingCents,
    totalCents,
    vatCents: vatIncludedCents(totalCents),
    freeShippingRemainingCents: Math.max(0, site.shipping.freeFromCents - subtotalCents),
  }
}
