import { describe, expect, it } from 'vitest'
import { PRODUCTS, QUANTITY_DISCOUNTS, getProduct } from '@/config/products'
import { site } from '@/config/site'
import type { Design, Layer, TextLayer } from '@/lib/design'
import {
  computeCartTotals,
  computeShippingCents,
  isPostalCodeDeliverable,
  isValidSpanishPostalCode,
  normalizePostalCode,
  priceLine,
  printCharges,
  quantityDiscountPct,
  tierPrice,
  totalQuantity,
  unitPriceCents,
  vatIncludedCents,
  type LineInput,
  type LinePrice,
  type PriceError,
} from '@/lib/pricing'
import { DEFAULT_CATALOG, DEFAULT_SETTINGS, catalogFromSettings, mergeSettings, type Catalog } from '@/lib/settings-schema'

/* ───────────── Utilidades ───────────── */

/** Capa de texto válida. `x`/`y` es el centro en cm desde la esquina de la zona; `width`/`height`, la caja sin rotar. */
function text(box: { x: number; y: number; width: number; height: number; rotation?: number }, id = 't1'): TextLayer {
  return { id, type: 'text', text: 'Hola', font: 'fredoka', sizeCm: 2, fill: '#1b1340', align: 'center', rotation: 0, ...box }
}

function design(areas: Record<string, Layer[]>, productId: Design['productId'] = 'camiseta', colorId = 'blanco'): Design {
  return { v: 1, productId, colorId, areas: Object.fromEntries(Object.entries(areas).map(([id, layers]) => [id, { layers }])) }
}

/** Camiseta blanca con una sola capa centrada de `w × h` cm en el frente (zona de 30 × 40 cm). */
function shirt(w: number, h: number, sizes: Record<string, number> = { M: 1 }): LineInput {
  return { productId: 'camiseta', colorId: 'blanco', sizes, design: design({ frente: [text({ x: 15, y: 20, width: w, height: h })] }) }
}

function ok(result: LinePrice | PriceError): LinePrice {
  if (!result.ok) throw new Error(`Se esperaba un precio y se obtuvo el error: ${result.error}`)
  return result
}

function errorOf(result: LinePrice | PriceError): string {
  if (result.ok) throw new Error(`Se esperaba un error y se obtuvo un precio de ${result.totalCents} céntimos`)
  return result.error
}

const FRENTE_TIERS = getProduct('camiseta')!.printTiers.frente

/* ───────────── Escalones de estampado ───────────── */

describe('tierPrice', () => {
  it('no cobra nada sin escalones o sin superficie usada', () => {
    expect(tierPrice(undefined, 50)).toBe(0)
    expect(tierPrice([], 50)).toBe(0)
    expect(tierPrice(FRENTE_TIERS, 0)).toBe(0)
    expect(tierPrice(FRENTE_TIERS, -3)).toBe(0)
  })

  it('el límite de cada escalón es inclusivo, con una tolerancia de 0,01 cm² por redondeo', () => {
    expect(tierPrice(FRENTE_TIERS, 100)).toBe(250)
    // 10 × 10,0005 cm = 100,005 cm²: el ruido de coma flotante no debe subir de escalón
    expect(tierPrice(FRENTE_TIERS, 100.005)).toBe(250)
    expect(tierPrice(FRENTE_TIERS, 100.02)).toBe(400)
    expect(tierPrice(FRENTE_TIERS, 1200)).toBe(1000)
  })

  it('por encima del último escalón cobra el último (la zona ya recorta la superficie)', () => {
    expect(tierPrice(FRENTE_TIERS, 5000)).toBe(1000)
  })
})

describe('priceLine: estampado', () => {
  it.each([
    [10, 10, 100, 250],
    [20, 12.5, 250, 400],
    [20, 25, 500, 600],
    [20, 40, 800, 800],
    [30, 40, 1200, 1000],
  ])('una caja de %i × %s cm (%i cm²) cobra el escalón de %i céntimos', (w, h, cm2, cents) => {
    const price = ok(priceLine(shirt(w, h)))
    expect(price.prints).toHaveLength(1)
    expect(price.prints[0]).toMatchObject({ areaId: 'frente', label: 'Frente', cents })
    expect(price.prints[0].usedCm2).toBeCloseTo(cm2, 5)
    expect(price.printCents).toBe(cents)
    expect(price.unitBaseCents).toBe(890)
    expect(price.totalCents).toBe(890 + cents)
  })

  it('una capa mayor que la zona se recorta a la zona (30 × 40 cm = 1200 cm²)', () => {
    const price = ok(priceLine(shirt(50, 50)))
    expect(price.prints[0].usedCm2).toBeCloseTo(1200, 5)
    expect(price.printCents).toBe(1000)
  })

  it('una capa rotada ocupa una caja envolvente mayor y puede subir de escalón', () => {
    const recta = ok(priceLine({ ...shirt(20, 10), design: design({ frente: [text({ x: 15, y: 20, width: 20, height: 10, rotation: 0 })] }) }))
    const girada = ok(priceLine({ ...shirt(20, 10), design: design({ frente: [text({ x: 15, y: 20, width: 20, height: 10, rotation: 45 })] }) }))
    expect(recta.prints[0].usedCm2).toBeCloseTo(200, 5)
    expect(recta.printCents).toBe(400)
    // caja de (20 + 10) · cos 45° de lado ≈ 21,2 cm → ≈ 450 cm²
    expect(girada.prints[0].usedCm2).toBeCloseTo(450, 0)
    expect(girada.printCents).toBe(600)
  })

  it('solo cuenta la parte de la capa que queda dentro de la zona', () => {
    // 20 cm de ancho centrada en x = 25: de 15 a 35, pero la zona acaba en 30 → 15 × 10 = 150 cm²
    const parcial = ok(priceLine({ ...shirt(20, 10), design: design({ frente: [text({ x: 25, y: 20, width: 20, height: 10 })] }) }))
    expect(parcial.prints[0].usedCm2).toBeCloseTo(150, 5)
    expect(parcial.printCents).toBe(400)

    // Completamente fuera: no hay nada que imprimir
    const fuera = priceLine({ ...shirt(20, 10), design: design({ frente: [text({ x: 50, y: 20, width: 20, height: 10 })] }) })
    expect(errorOf(fuera)).toBe('Añade una imagen, texto o pegatina a la zona de estampado.')
  })

  it('suma el estampado de cada zona usada, cada una con sus escalones', () => {
    const price = ok(
      priceLine({
        productId: 'camiseta',
        colorId: 'blanco',
        sizes: { M: 1 },
        design: design({
          frente: [text({ x: 15, y: 20, width: 10, height: 10 })],
          pecho: [text({ x: 5, y: 5, width: 5, height: 5 }, 't2')], // 25 cm² en pecho (≤ 50 → 200)
          espalda: [text({ x: 15, y: 20, width: 10, height: 10 }, 't3')],
        }),
      }),
    )
    expect(price.prints.map((p) => [p.label, p.cents])).toEqual([
      ['Frente', 250],
      ['Pecho izquierdo', 200],
      ['Espalda', 250],
    ])
    expect(price.printCents).toBe(700)
    expect(price.totalCents).toBe(890 + 700)
  })

  it('una zona declarada pero vacía no cuenta como diseño', () => {
    expect(errorOf(priceLine({ ...shirt(10, 10), design: design({ frente: [] }) }))).toBe('Añade una imagen, texto o pegatina a la zona de estampado.')
  })

  it('printCharges y unitPriceCents reflejan el mismo cálculo por unidad', () => {
    const taza = getProduct('taza')!
    const d = design({ envolvente: [text({ x: 10, y: 4.25, width: 10, height: 5 })] }, 'taza', 'rosa')
    expect(printCharges(taza, d)).toEqual([{ areaId: 'envolvente', label: 'Envolvente', usedCm2: 50, cents: 250 }])
    expect(unitPriceCents(taza, 'rosa', d)).toBe(490 + 150 + 250)
    expect(printCharges(taza, design({}, 'taza', 'rosa'))).toEqual([])
  })
})

/* ───────────── Unidades, tallas, color y descuentos ───────────── */

describe('priceLine: unidades, tallas y suplementos', () => {
  it('suma las unidades de todas las tallas (las que están a cero no molestan)', () => {
    const price = ok(priceLine(shirt(10, 10, { S: 2, M: 3, L: 0 })))
    expect(price.quantity).toBe(5)
  })

  it('aplica el suplemento de talla XXL por unidad, fuera del precio base', () => {
    const price = ok(priceLine(shirt(10, 10, { XXL: 2, M: 1 })))
    expect(price.sizeSurchargeCents).toBe(2 * 150)
    expect(price.grossCents).toBe(3 * (890 + 250) + 300)
    expect(price.discountPct).toBe(0)
    expect(price.totalCents).toBe(3720)
    expect(price.avgUnitCents).toBe(1240)
  })

  it('la sudadera tiene su propio suplemento de XXL y sus propios escalones', () => {
    const hoodie: LineInput = {
      productId: 'hoodie',
      colorId: 'negro',
      sizes: { XXL: 1 },
      design: design({ frente: [text({ x: 15, y: 17, width: 10, height: 10 })] }, 'hoodie', 'negro'),
    }
    const price = ok(priceLine(hoodie))
    expect(price.unitBaseCents).toBe(2190)
    expect(price.printCents).toBe(300)
    expect(price.sizeSurchargeCents).toBe(200)
    expect(price.totalCents).toBe(2190 + 300 + 200)
  })

  it('el interior de color de la taza suma 1,50 € por unidad al precio base', () => {
    const mug = (colorId: string): LineInput => ({
      productId: 'taza',
      colorId,
      sizes: { unica: 2 },
      design: design({ envolvente: [text({ x: 10, y: 4.25, width: 10, height: 5 })] }, 'taza', colorId),
    })
    const blanca = ok(priceLine(mug('blanca')))
    const rosa = ok(priceLine(mug('rosa')))
    expect(blanca.unitBaseCents).toBe(490)
    expect(rosa.unitBaseCents).toBe(640)
    expect(rosa.totalCents - blanca.totalCents).toBe(2 * 150)
  })
})

describe('descuentos por volumen', () => {
  it.each([
    [0, 0],
    [1, 0],
    [4, 0],
    [5, 5],
    [9, 5],
    [10, 10],
    [24, 10],
    [25, 15],
    [49, 15],
    [50, 20],
    [500, 20],
  ])('%i unidades → %i %%', (qty, pct) => {
    expect(quantityDiscountPct(qty)).toBe(pct)
  })

  it('admite una tabla de descuentos distinta (y sin descuentos devuelve 0)', () => {
    expect(quantityDiscountPct(3, [{ minQty: 1, pct: 0 }, { minQty: 3, pct: 50 }])).toBe(50)
    expect(quantityDiscountPct(100, [])).toBe(0)
  })

  it('priceLine descuenta sobre el bruto y redondea al céntimo (medio céntimo hacia arriba)', () => {
    const cinco = ok(priceLine(shirt(10, 10, { M: 5 })))
    expect(cinco.grossCents).toBe(5700)
    expect(cinco.discountPct).toBe(5)
    expect(cinco.discountCents).toBe(285)
    expect(cinco.totalCents).toBe(5415)
    expect(cinco.avgUnitCents).toBe(1083)

    // 5 unidades con una XXL: 5 × 11,40 + 1,50 = 58,50 € → 5 % = 2,925 € → 2,93 €
    const conXxl = ok(priceLine(shirt(10, 10, { M: 4, XXL: 1 })))
    expect(conXxl.grossCents).toBe(5850)
    expect(conXxl.discountCents).toBe(293)
    expect(conXxl.totalCents).toBe(5557)
    expect(conXxl.avgUnitCents).toBe(1111)
  })

  it('a partir de 10, 25 y 50 unidades aplica 10, 15 y 20 %', () => {
    expect(ok(priceLine(shirt(10, 10, { M: 10 }))).totalCents).toBe(11400 - 1140)
    expect(ok(priceLine(shirt(10, 10, { M: 25 }))).totalCents).toBe(28500 - 4275)
    expect(ok(priceLine(shirt(10, 10, { M: 50 }))).totalCents).toBe(57000 - 11400)
  })
})

describe('priceLine: tope de unidades por línea', () => {
  it('acepta exactamente el máximo del producto y rechaza una unidad más', () => {
    expect(ok(priceLine(shirt(10, 10, { M: 500 }))).discountPct).toBe(20)
    expect(errorOf(priceLine(shirt(10, 10, { M: 501 })))).toBe('Para más de 500 unidades de este diseño pídenos presupuesto.')
    expect(errorOf(priceLine(shirt(10, 10, { S: 300, M: 201 })))).toBe('Para más de 500 unidades de este diseño pídenos presupuesto.')
  })

  it('cada producto tiene su propio tope (gorra: 300)', () => {
    const gorra = (qty: number): LineInput => ({
      productId: 'gorra',
      colorId: 'negro',
      sizes: { unica: qty },
      design: design({ frontal: [text({ x: 6, y: 3.25, width: 6, height: 4 })] }, 'gorra', 'negro'),
    })
    expect(ok(priceLine(gorra(300))).quantity).toBe(300)
    expect(errorOf(priceLine(gorra(301)))).toBe('Para más de 300 unidades de este diseño pídenos presupuesto.')
  })
})

/* ───────────── Errores ───────────── */

describe('priceLine: entradas no válidas', () => {
  const base = shirt(10, 10)

  it.each<[string, LineInput, string]>([
    ['talla que no existe', { ...base, sizes: { XXXL: 1 } }, 'Talla no válida: XXXL.'],
    ['cantidad negativa', { ...base, sizes: { M: -1 } }, 'Cantidad no válida.'],
    ['cantidad decimal', { ...base, sizes: { M: 1.5 } }, 'Cantidad no válida.'],
    ['cero unidades', { ...base, sizes: { M: 0 } }, 'Elige al menos una unidad.'],
    ['sin tallas', { ...base, sizes: {} }, 'Elige al menos una unidad.'],
    ['producto desconocido', { ...base, productId: 'bolsa' }, 'Producto desconocido.'],
    ['color que no tiene el producto', { ...base, colorId: 'fucsia' }, 'Color no disponible.'],
    ['diseño sin ninguna zona', { ...base, design: design({}) }, 'Añade una imagen, texto o pegatina a la zona de estampado.'],
    [
      'diseño de otro producto',
      { ...base, design: design({ frente: [text({ x: 15, y: 17, width: 10, height: 10 })] }, 'hoodie', 'negro') },
      'El diseño no coincide con el producto o el color elegidos.',
    ],
    ['diseño de otro color', { ...base, design: design({ frente: [text({ x: 15, y: 20, width: 10, height: 10 })] }, 'camiseta', 'negro') }, 'El diseño no coincide con el producto o el color elegidos.'],
    ['zona de estampado desconocida', { ...base, design: design({ manga: [text({ x: 5, y: 5, width: 4, height: 4 })] }) }, 'Zona de estampado desconocida: manga.'],
    [
      'capa corrupta (sin tipografía)',
      { ...base, design: { ...base.design, areas: { frente: { layers: [{ ...text({ x: 15, y: 20, width: 10, height: 10 }), font: undefined } as unknown as Layer] } } } },
      'El diseño no es válido.',
    ],
  ])('%s → %s', (_name, input, message) => {
    expect(errorOf(priceLine(input))).toBe(message)
  })

  it('totalQuantity ignora valores que no son números finitos', () => {
    expect(totalQuantity({ M: 2, L: Number.NaN, S: Number.POSITIVE_INFINITY })).toBe(2)
    expect(totalQuantity({})).toBe(0)
  })
})

/* ───────────── Catálogo efectivo ───────────── */

describe('catálogo efectivo', () => {
  it('DEFAULT_CATALOG reproduce exactamente los precios definidos en código', () => {
    expect(DEFAULT_CATALOG.products.map((p) => p.id)).toEqual(PRODUCTS.map((p) => p.id))
    for (const product of PRODUCTS) {
      const effective = DEFAULT_CATALOG.products.find((p) => p.id === product.id)!
      expect(effective.basePriceCents).toBe(product.basePriceCents)
      expect(effective.printTiers).toEqual(product.printTiers)
      expect(effective.maxQtyPerLine).toBe(product.maxQtyPerLine)
      expect(effective.sizeSurchargesCents).toEqual(product.sizeSurchargesCents ?? {})
      expect(effective.colors.map((c) => [c.id, c.surchargeCents ?? 0])).toEqual(product.colors.map((c) => [c.id, c.surchargeCents ?? 0]))
      // Lo que no es precio (vistas, zonas, textos) se conserva tal cual
      expect(effective.views).toBe(product.views)
      expect(effective.name).toBe(product.name)
    }
    expect(DEFAULT_CATALOG.quantityDiscounts).toEqual(QUANTITY_DISCOUNTS)
    expect(DEFAULT_CATALOG.shipping).toEqual(site.shipping)
    expect(DEFAULT_CATALOG.vatRate).toBe(site.vatRate)
  })

  it('sin catálogo explícito, priceLine usa DEFAULT_CATALOG', () => {
    const input = shirt(10, 10, { M: 7, XXL: 1 })
    expect(priceLine(input)).toEqual(priceLine(input, DEFAULT_CATALOG))
  })

  it('un catálogo con otros precios cambia el resultado (precio base, escalones y descuentos)', () => {
    const camiseta = structuredClone(DEFAULT_SETTINGS.pricing.products.camiseta!)
    camiseta.basePriceCents = 1200
    camiseta.printTiers.frente = [{ upToCm2: 1200, cents: 100 }]
    const merged = mergeSettings({
      pricing: { products: { camiseta }, quantityDiscounts: [{ minQty: 1, pct: 0 }, { minQty: 3, pct: 50 }] },
      shipping: { flatCents: 300, freeFromCents: 2000, balearesExtraCents: 100, excludedPostalPrefixes: ['28'] },
    })
    expect(merged.invalid).toEqual([])
    const catalog: Catalog = catalogFromSettings(merged.settings)

    const input = shirt(10, 10, { M: 3 })
    const custom = ok(priceLine(input, catalog))
    expect(custom.unitBaseCents).toBe(1200)
    expect(custom.printCents).toBe(100)
    expect(custom.grossCents).toBe(3 * 1300)
    expect(custom.discountPct).toBe(50)
    expect(custom.totalCents).toBe(1950)

    const standard = ok(priceLine(input))
    expect(standard.totalCents).toBe(3 * 1140)

    // Las reglas de envío del catálogo también mandan
    expect(computeShippingCents(1000, '08001', catalog.shipping)).toBe(300)
    expect(computeShippingCents(1000, '28001', catalog.shipping)).toBeNull()
    expect(computeShippingCents(1000, '07001', catalog.shipping)).toBe(400)
    expect(computeShippingCents(2000, '08001', catalog.shipping)).toBe(0)

    // Los demás productos conservan los precios por defecto
    expect(catalog.products.find((p) => p.id === 'taza')!.basePriceCents).toBe(490)
  })
})

/* ───────────── Envío, IVA y totales ───────────── */

describe('códigos postales y envío', () => {
  it('normaliza y valida códigos postales españoles', () => {
    expect(normalizePostalCode(' 28 001 ')).toBe('28001')
    for (const cp of ['01001', '28001', '52006', '07800']) expect(isValidSpanishPostalCode(cp), cp).toBe(true)
    for (const cp of ['00100', '53000', '2800', '280011', 'abcde', '']) expect(isValidSpanishPostalCode(cp), cp).toBe(false)
  })

  it('no envía a Canarias (35, 38), Ceuta (51) ni Melilla (52)', () => {
    for (const cp of ['28001', '07800', '08001', '50001']) expect(isPostalCodeDeliverable(cp), cp).toBe(true)
    for (const cp of ['35001', '38001', '51001', '52001', '99999', '2800']) expect(isPostalCodeDeliverable(cp), cp).toBe(false)
  })

  it.each<[string, number, string | undefined, number | null]>([
    ['sin código postal se estima el envío peninsular', 1000, undefined, 495],
    ['envío gratis exactamente desde 60 €', 6000, undefined, 0],
    ['un céntimo por debajo de 60 € se cobra', 5999, '28001', 495],
    ['península', 1000, '28001', 495],
    ['Baleares lleva 3 € de suplemento', 1000, '07001', 795],
    ['a Baleares también es gratis desde 60 €', 6000, '07001', 0],
    ['Las Palmas no se envía', 1000, '35001', null],
    ['Tenerife no se envía', 1000, '38001', null],
    ['Ceuta no se envía', 1000, '51001', null],
    ['Melilla no se envía', 1000, '52001', null],
    ['un código postal inválido no se envía', 1000, '99999', null],
    ['un código postal incompleto no se envía', 1000, '2800', null],
    ['los espacios se ignoran', 1000, '28 001', 495],
    ['una cadena vacía equivale a no tener código postal', 1000, '', 495],
  ])('%s', (_name, subtotal, cp, expected) => {
    expect(computeShippingCents(subtotal, cp)).toBe(expected)
  })
})

describe('IVA incluido y totales del carrito', () => {
  it('vatIncludedCents saca el IVA contenido en un importe que ya lo incluye', () => {
    expect(vatIncludedCents(12100)).toBe(2100)
    expect(vatIncludedCents(100)).toBe(17) // 100 − 82,64
    expect(vatIncludedCents(0)).toBe(0)
    expect(vatIncludedCents(1100, 0.1)).toBe(100)
  })

  it('computeCartTotals suma líneas, envío e IVA y dice cuánto falta para el envío gratis', () => {
    expect(computeCartTotals([1140, 2000], '28001')).toEqual({
      subtotalCents: 3140,
      shippingCents: 495,
      totalCents: 3635,
      vatCents: 631,
      freeShippingRemainingCents: 2860,
    })
  })

  it('con envío gratis el total es el subtotal y no falta nada', () => {
    const totals = computeCartTotals([6000])
    expect(totals.shippingCents).toBe(0)
    expect(totals.totalCents).toBe(6000)
    expect(totals.freeShippingRemainingCents).toBe(0)
  })

  it('a un código postal sin envío el envío es null y el total no lo incluye', () => {
    const totals = computeCartTotals([1140], '35001')
    expect(totals.shippingCents).toBeNull()
    expect(totals.totalCents).toBe(1140)
  })

  it('Baleares suma su suplemento al total', () => {
    expect(computeCartTotals([1140], '07001').totalCents).toBe(1140 + 795)
  })
})
