/**
 * Catálogo de productos personalizables.
 *
 * - Precios en CÉNTIMOS de euro, IVA (21 %) incluido.
 * - Las vistas (`views`) describen el mockup SVG de cada producto: su viewBox, la escala
 *   (`pxPerCm`) y dónde está cada zona de estampado (`center`, en unidades del viewBox).
 *   Lo usan tanto el editor (Konva) como los mockups SVG de `src/components/mockups`.
 * - Todas las medidas de estampado son centímetros.
 */

export type ProductId = 'camiseta' | 'hoodie' | 'gorra' | 'taza'

export interface PrintArea {
  /** Identificador único dentro del producto. Es la clave en `design.areas`. */
  id: string
  label: string
  /** Tamaño máximo imprimible en cm. */
  widthCm: number
  heightCm: number
  /** Centro de la zona en unidades del viewBox de su vista. */
  center: { x: number; y: number }
}

export interface ProductView {
  id: string
  label: string
  viewBox: { width: number; height: number }
  /** Píxeles del viewBox que representan 1 cm real en la zona de estampado. */
  pxPerCm: number
  areas: PrintArea[]
}

export interface ProductColor {
  id: string
  name: string
  hex: string
  /** true si el color es claro (para elegir contraste de textos/bordes). */
  light?: boolean
  /** Suplemento por unidad en céntimos (p. ej. tazas con interior de color). */
  surchargeCents?: number
}

export interface ProductSize {
  id: string
  label: string
}

export interface PrintTier {
  /** Superficie usada máxima (cm²) para este escalón. */
  upToCm2: number
  cents: number
}

export interface QuantityDiscount {
  minQty: number
  pct: number
}

export interface Product {
  id: ProductId
  slug: string
  name: string
  namePlural: string
  category: 'ropa' | 'accesorios' | 'hogar'
  tagline: string
  description: string
  highlights: string[]
  specs: { label: string; value: string }[]
  care: string[]
  /** Precio de la prenda/producto sin estampar. */
  basePriceCents: number
  colors: ProductColor[]
  sizes: ProductSize[]
  /** Suplemento por talla (id de talla → céntimos por unidad). */
  sizeSurchargesCents?: Record<string, number>
  views: ProductView[]
  /** Precio del estampado por zona, según la superficie realmente usada (caja envolvente de las capas). */
  printTiers: Record<string, PrintTier[]>
  /** Máximo de unidades por línea de pedido (por encima conviene presupuesto). */
  maxQtyPerLine: number
}

/* ───────────────────────── Paletas ───────────────────────── */

const clothingColors: ProductColor[] = [
  { id: 'blanco', name: 'Blanco', hex: '#FFFFFF', light: true },
  { id: 'crema', name: 'Crema', hex: '#F3E8D3', light: true },
  { id: 'gris', name: 'Gris jaspeado', hex: '#B9BAC4', light: true },
  { id: 'negro', name: 'Negro', hex: '#1B1B22' },
  { id: 'marino', name: 'Azul marino', hex: '#1F2A5C' },
  { id: 'royal', name: 'Azul royal', hex: '#2B59E8' },
  { id: 'turquesa', name: 'Turquesa', hex: '#12B8A6' },
  { id: 'verde', name: 'Verde', hex: '#2E9E4F' },
  { id: 'amarillo', name: 'Amarillo', hex: '#FFD23F', light: true },
  { id: 'naranja', name: 'Naranja', hex: '#FF7A3D' },
  { id: 'rojo', name: 'Rojo', hex: '#DD2A3C' },
  { id: 'rosa', name: 'Rosa chicle', hex: '#FF8FC1', light: true },
  { id: 'lila', name: 'Lila', hex: '#B49CFF', light: true },
]

const pick = (ids: string[]) => ids.map((id) => clothingColors.find((c) => c.id === id)!)

/** En las tazas, `hex` es el color del INTERIOR y el ASA; el cuerpo de la taza siempre es blanco. */
const mugColors: ProductColor[] = [
  { id: 'blanca', name: 'Toda blanca', hex: '#FFFFFF', light: true },
  { id: 'rosa', name: 'Interior y asa rosa', hex: '#FF4F9A', surchargeCents: 150 },
  { id: 'azul', name: 'Interior y asa azul', hex: '#2B59E8', surchargeCents: 150 },
  { id: 'amarillo', name: 'Interior y asa amarilla', hex: '#FFC93C', light: true, surchargeCents: 150 },
  { id: 'negro', name: 'Interior y asa negra', hex: '#1B1B22', surchargeCents: 150 },
]

const adultSizes: ProductSize[] = [
  { id: 'XS', label: 'XS' },
  { id: 'S', label: 'S' },
  { id: 'M', label: 'M' },
  { id: 'L', label: 'L' },
  { id: 'XL', label: 'XL' },
  { id: 'XXL', label: 'XXL' },
]
const hoodieSizes = adultSizes.filter((s) => s.id !== 'XS')
const oneSize: ProductSize[] = [{ id: 'unica', label: 'Talla única' }]

/* ───────────────────────── Productos ───────────────────────── */

export const PRODUCTS: Product[] = [
  {
    id: 'camiseta',
    slug: 'camisetas-personalizadas',
    name: 'Camiseta',
    namePlural: 'Camisetas',
    category: 'ropa',
    tagline: 'Tu diseño, de pecho a espalda',
    description:
      'Camiseta unisex de algodón, cómoda y resistente, con tu diseño impreso en DTF: colores vivos, detalle fino y un tacto suave. Perfecta para regalos, grupos, eventos y equipos.',
    highlights: [
      'Impresión DTF a todo color, también con degradados y fotos',
      'Sin mínimo de unidades: una sola camiseta también vale',
      'Elige frente, espalda y logo en el pecho',
      'Corte unisex, tallas de XS a XXL',
    ],
    specs: [
      { label: 'Material', value: 'Algodón (peso medio, unos 150 g/m²)' },
      { label: 'Corte', value: 'Unisex, manga corta' },
      { label: 'Zonas de estampado', value: 'Frente (30 × 40 cm), pecho (10 × 10 cm), espalda (30 × 40 cm)' },
      { label: 'Tallas', value: 'XS · S · M · L · XL · XXL' },
    ],
    care: [
      'Lavar del revés a un máximo de 30 °C.',
      'No usar lejía ni secadora a temperatura alta.',
      'Planchar del revés y sin vapor sobre el estampado.',
    ],
    basePriceCents: 890,
    colors: pick(['blanco', 'crema', 'gris', 'negro', 'marino', 'royal', 'turquesa', 'verde', 'amarillo', 'naranja', 'rojo', 'rosa', 'lila']),
    sizes: adultSizes,
    sizeSurchargesCents: { XXL: 150 },
    views: [
      {
        id: 'front',
        label: 'Delante',
        viewBox: { width: 600, height: 700 },
        pxPerCm: 7.3,
        areas: [
          { id: 'frente', label: 'Frente', widthCm: 30, heightCm: 40, center: { x: 300, y: 368 } },
          { id: 'pecho', label: 'Pecho izquierdo', widthCm: 10, heightCm: 10, center: { x: 370, y: 218 } },
        ],
      },
      {
        id: 'back',
        label: 'Detrás',
        viewBox: { width: 600, height: 700 },
        pxPerCm: 7.3,
        areas: [{ id: 'espalda', label: 'Espalda', widthCm: 30, heightCm: 40, center: { x: 300, y: 348 } }],
      },
    ],
    printTiers: {
      frente: [
        { upToCm2: 100, cents: 250 },
        { upToCm2: 250, cents: 400 },
        { upToCm2: 500, cents: 600 },
        { upToCm2: 800, cents: 800 },
        { upToCm2: 1200, cents: 1000 },
      ],
      espalda: [
        { upToCm2: 100, cents: 250 },
        { upToCm2: 250, cents: 400 },
        { upToCm2: 500, cents: 600 },
        { upToCm2: 800, cents: 800 },
        { upToCm2: 1200, cents: 1000 },
      ],
      pecho: [
        { upToCm2: 50, cents: 200 },
        { upToCm2: 100, cents: 250 },
      ],
    },
    maxQtyPerLine: 500,
  },
  {
    id: 'hoodie',
    slug: 'sudaderas-personalizadas',
    name: 'Sudadera con capucha',
    namePlural: 'Sudaderas con capucha',
    category: 'ropa',
    tagline: 'El hoodie que nadie más tendrá',
    description:
      'Sudadera con capucha unisex, interior suave y bolsillo canguro. Estampamos tu diseño en DTF con colores intensos que aguantan el uso diario.',
    highlights: [
      'Gran superficie de estampado en espalda y frente',
      'Logo pequeño en el pecho para equipos y empresas',
      'Colores vivos incluso sobre tejidos oscuros',
      'Tallas de S a XXL',
    ],
    specs: [
      { label: 'Material', value: 'Mezcla de algodón y poliéster con interior suave' },
      { label: 'Corte', value: 'Unisex, con capucha y bolsillo canguro' },
      { label: 'Zonas de estampado', value: 'Frente (30 × 34 cm), pecho (10 × 10 cm), espalda (32 × 40 cm)' },
      { label: 'Tallas', value: 'S · M · L · XL · XXL' },
    ],
    care: [
      'Lavar del revés a un máximo de 30 °C.',
      'No usar lejía; secar al aire o a baja temperatura.',
      'No planchar directamente sobre el estampado.',
    ],
    basePriceCents: 2190,
    colors: pick(['blanco', 'gris', 'negro', 'marino', 'royal', 'verde', 'rojo', 'rosa']),
    sizes: hoodieSizes,
    sizeSurchargesCents: { XXL: 200 },
    views: [
      {
        id: 'front',
        label: 'Delante',
        viewBox: { width: 640, height: 740 },
        pxPerCm: 6.6,
        areas: [
          { id: 'frente', label: 'Frente', widthCm: 30, heightCm: 34, center: { x: 320, y: 388 } },
          { id: 'pecho', label: 'Pecho izquierdo', widthCm: 10, heightCm: 10, center: { x: 384, y: 304 } },
        ],
      },
      {
        id: 'back',
        label: 'Detrás',
        viewBox: { width: 640, height: 740 },
        pxPerCm: 6.6,
        areas: [{ id: 'espalda', label: 'Espalda', widthCm: 32, heightCm: 40, center: { x: 320, y: 410 } }],
      },
    ],
    printTiers: {
      frente: [
        { upToCm2: 100, cents: 300 },
        { upToCm2: 250, cents: 450 },
        { upToCm2: 500, cents: 650 },
        { upToCm2: 800, cents: 850 },
        { upToCm2: 1020, cents: 1050 },
      ],
      espalda: [
        { upToCm2: 100, cents: 300 },
        { upToCm2: 250, cents: 450 },
        { upToCm2: 500, cents: 650 },
        { upToCm2: 800, cents: 850 },
        { upToCm2: 1280, cents: 1100 },
      ],
      pecho: [
        { upToCm2: 50, cents: 250 },
        { upToCm2: 100, cents: 300 },
      ],
    },
    maxQtyPerLine: 300,
  },
  {
    id: 'gorra',
    slug: 'gorras-personalizadas',
    name: 'Gorra',
    namePlural: 'Gorras',
    category: 'accesorios',
    tagline: 'Tu logo o tu frase, a la cabeza',
    description:
      'Gorra de visera curva con cierre ajustable y talla única. Imprimimos tu diseño en el frontal y, si quieres, un detalle en el lateral.',
    highlights: [
      'Talla única con cierre ajustable',
      'Frontal de 12 × 6,5 cm y lateral opcional',
      'Ideal para equipos, eventos, marcas y regalos',
    ],
    specs: [
      { label: 'Material', value: 'Algodón, visera curva' },
      { label: 'Talla', value: 'Única, cierre ajustable' },
      { label: 'Zonas de estampado', value: 'Frontal (12 × 6,5 cm), lateral (7 × 4,5 cm)' },
    ],
    care: [
      'Limpiar a mano con un paño húmedo y jabón neutro.',
      'No meter en la lavadora ni en la secadora.',
      'No planchar sobre el estampado.',
    ],
    basePriceCents: 790,
    colors: pick(['blanco', 'crema', 'negro', 'marino', 'rojo', 'rosa', 'verde']),
    sizes: oneSize,
    views: [
      {
        id: 'front',
        label: 'Frontal',
        viewBox: { width: 600, height: 520 },
        pxPerCm: 24,
        areas: [{ id: 'frontal', label: 'Frontal', widthCm: 12, heightCm: 6.5, center: { x: 300, y: 228 } }],
      },
      {
        id: 'side',
        label: 'Lateral',
        viewBox: { width: 600, height: 520 },
        pxPerCm: 18,
        areas: [{ id: 'lateral', label: 'Lateral', widthCm: 7, heightCm: 4.5, center: { x: 332, y: 262 } }],
      },
    ],
    printTiers: {
      frontal: [
        { upToCm2: 30, cents: 250 },
        { upToCm2: 78, cents: 350 },
      ],
      lateral: [{ upToCm2: 32, cents: 250 }],
    },
    maxQtyPerLine: 300,
  },
  {
    id: 'taza',
    slug: 'tazas-personalizadas',
    name: 'Taza',
    namePlural: 'Tazas',
    category: 'hogar',
    tagline: 'El desayuno con tu sello',
    description:
      'Taza de cerámica de 330 ml con tu diseño en toda la superficie. Un regalo que se usa cada día, para ti, tu equipo o tu negocio.',
    highlights: [
      'Estampado envolvente de 20 × 8,5 cm',
      'Opciones con interior y asa de color',
      'Regalo perfecto: fotos, frases, dibujos y logotipos',
    ],
    specs: [
      { label: 'Material', value: 'Cerámica, 330 ml' },
      { label: 'Zona de estampado', value: 'Envolvente (20 × 8,5 cm)' },
      { label: 'Colores', value: 'Blanca, o con interior y asa de color' },
    ],
    care: [
      'Recomendamos lavar a mano con esponja suave para que el estampado dure más.',
      'Evitar estropajos abrasivos y golpes.',
    ],
    basePriceCents: 490,
    colors: mugColors,
    sizes: oneSize,
    views: [
      {
        id: 'wrap',
        label: 'Plantilla envolvente',
        viewBox: { width: 760, height: 400 },
        pxPerCm: 30,
        areas: [{ id: 'envolvente', label: 'Envolvente', widthCm: 20, heightCm: 8.5, center: { x: 380, y: 205 } }],
      },
    ],
    printTiers: {
      envolvente: [
        { upToCm2: 60, cents: 250 },
        { upToCm2: 120, cents: 350 },
        { upToCm2: 170, cents: 450 },
      ],
    },
    maxQtyPerLine: 500,
  },
]

/** Descuento por volumen (por línea de pedido, según unidades totales). */
export const QUANTITY_DISCOUNTS: QuantityDiscount[] = [
  { minQty: 1, pct: 0 },
  { minQty: 5, pct: 5 },
  { minQty: 10, pct: 10 },
  { minQty: 25, pct: 15 },
  { minQty: 50, pct: 20 },
]

/* ───────────────────────── Utilidades ───────────────────────── */

export const PRODUCT_LIST = PRODUCTS

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

export function getColor(product: Product, colorId: string): ProductColor | undefined {
  return product.colors.find((c) => c.id === colorId)
}

export function getView(product: Product, viewId: string): ProductView | undefined {
  return product.views.find((v) => v.id === viewId)
}

/**
 * true si la superficie donde se estampa es oscura (para elegir tinta clara en guías y texto nuevo).
 * En las tazas el cuerpo siempre es blanco: el color solo afecta al interior y al asa.
 */
export function isDarkSurface(product: Product, colorId: string): boolean {
  if (product.id === 'taza') return false
  const color = getColor(product, colorId)
  return !!color && !color.light
}

export function allAreas(product: Product): (PrintArea & { viewId: string })[] {
  return product.views.flatMap((v) => v.areas.map((a) => ({ ...a, viewId: v.id })))
}

export function getArea(product: Product, areaId: string): (PrintArea & { viewId: string }) | undefined {
  return allAreas(product).find((a) => a.id === areaId)
}

/** Precio "desde": producto base + la zona de estampado más barata (el color base nunca suma). */
export function fromPriceCents(product: Product): number {
  const cheapestPrint = Math.min(
    ...Object.values(product.printTiers).map((tiers) => tiers[0]?.cents ?? 0),
  )
  return product.basePriceCents + (Number.isFinite(cheapestPrint) ? cheapestPrint : 0)
}

export function isSingleSize(product: Product): boolean {
  return product.sizes.length === 1
}
