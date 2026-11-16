/**
 * Modelo del diseño que crea el cliente en el personalizador.
 *
 * Unidades: TODO en centímetros, con origen en la esquina superior izquierda de la zona de
 * estampado (`PrintArea`). `x`/`y` son el CENTRO de la capa; `width`/`height` su tamaño SIN rotar.
 * El mismo modelo lo usan el editor, el cálculo de precio (cliente y servidor) y el panel de pedidos.
 */
import { z } from 'zod'
import { getArea, getColor, getProduct, type PrintArea, type ProductId } from '@/config/products'

/* ───────────── Tipografías disponibles en el editor ───────────── */

export const FONTS = {
  fredoka: { label: 'Fredoka', family: '"Fredoka Variable", "Fredoka", ui-rounded, sans-serif' },
  nunito: { label: 'Nunito', family: '"Nunito Variable", "Nunito", system-ui, sans-serif' },
  anton: { label: 'Anton', family: '"Anton", Impact, sans-serif' },
  bangers: { label: 'Bangers', family: '"Bangers", Impact, cursive' },
  pacifico: { label: 'Pacifico', family: '"Pacifico", cursive' },
  'permanent-marker': { label: 'Permanent Marker', family: '"Permanent Marker", cursive' },
  caveat: { label: 'Caveat', family: '"Caveat", cursive' },
  lobster: { label: 'Lobster', family: '"Lobster", cursive' },
  'bebas-neue': { label: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif' },
} as const

export type FontId = keyof typeof FONTS
export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]]

/* ───────────── Esquemas (zod) ───────────── */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const cm = z.number().finite()
const fileId = z.string().regex(/^[a-z0-9]{12,40}$/)

const baseLayer = z.object({
  id: z.string().min(1).max(40),
  /** Centro de la capa, en cm desde la esquina superior izquierda de la zona. */
  x: cm.min(-100).max(200),
  y: cm.min(-100).max(200),
  /** Tamaño sin rotar, en cm. */
  width: cm.positive().max(300),
  height: cm.positive().max(300),
  /** Grados, sentido horario. */
  rotation: cm.min(-720).max(720),
  opacity: z.number().min(0).max(1).optional(),
  flipX: z.boolean().optional(),
})

export const imageLayerSchema = baseLayer.extend({
  type: z.literal('image'),
  /** Archivo subido por el cliente (ver /api/uploads, kind "artwork"). */
  fileId,
  name: z.string().max(160).optional(),
  naturalWidth: z.number().int().min(1).max(40000),
  naturalHeight: z.number().int().min(1).max(40000),
})

export const textLayerSchema = baseLayer.extend({
  type: z.literal('text'),
  text: z.string().min(1).max(200),
  font: z.enum(FONT_IDS),
  /** Tamaño de fuente en cm. */
  sizeCm: cm.min(0.3).max(80),
  fill: hexColor,
  strokeColor: hexColor.optional(),
  strokeCm: cm.min(0).max(6).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right']),
  /** Curvatura del texto, de -100 (arco hacia arriba) a 100 (hacia abajo). 0 = recto. */
  arc: z.number().min(-100).max(100).optional(),
})

export const stickerLayerSchema = baseLayer.extend({
  type: z.literal('sticker'),
  /** Id de la biblioteca de pegatinas del editor (src/lib/stickers.ts). */
  stickerId: z.string().min(1).max(60),
  fill: hexColor.optional(),
})

export const layerSchema = z.discriminatedUnion('type', [imageLayerSchema, textLayerSchema, stickerLayerSchema])

export const designSchema = z.object({
  v: z.literal(1),
  productId: z.enum(['camiseta', 'hoodie', 'gorra', 'taza']),
  colorId: z.string().min(1).max(40),
  /** Capas por zona de estampado (clave = PrintArea.id). Las capas se apilan en orden: la última queda encima. */
  areas: z.record(z.string().max(40), z.object({ layers: z.array(layerSchema).max(40) })),
})

export type ImageLayer = z.infer<typeof imageLayerSchema>
export type TextLayer = z.infer<typeof textLayerSchema>
export type StickerLayer = z.infer<typeof stickerLayerSchema>
export type Layer = z.infer<typeof layerSchema>
export type Design = z.infer<typeof designSchema>

/* ───────────── Geometría ───────────── */

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Caja envolvente (alineada a los ejes) de una capa, teniendo en cuenta su rotación. */
export function layerBounds(layer: Pick<Layer, 'x' | 'y' | 'width' | 'height' | 'rotation'>): Rect {
  const rad = (layer.rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const w = layer.width * cos + layer.height * sin
  const h = layer.width * sin + layer.height * cos
  return { x0: layer.x - w / 2, y0: layer.y - h / 2, x1: layer.x + w / 2, y1: layer.y + h / 2 }
}

export interface AreaUsage {
  /** Superficie (cm²) de la caja que contiene todas las capas, recortada a la zona imprimible. */
  usedCm2: number
  /** Caja envolvente recortada a la zona (null si no hay nada dentro de la zona). */
  bbox: Rect | null
}

/** Superficie realmente usada en una zona (base del precio de impresión). */
export function areaUsage(layers: Layer[], area: Pick<PrintArea, 'widthCm' | 'heightCm'>): AreaUsage {
  let bbox: Rect | null = null
  for (const layer of layers) {
    const b = layerBounds(layer)
    const clipped: Rect = {
      x0: Math.max(0, b.x0),
      y0: Math.max(0, b.y0),
      x1: Math.min(area.widthCm, b.x1),
      y1: Math.min(area.heightCm, b.y1),
    }
    if (clipped.x1 <= clipped.x0 || clipped.y1 <= clipped.y0) continue
    bbox = bbox
      ? {
          x0: Math.min(bbox.x0, clipped.x0),
          y0: Math.min(bbox.y0, clipped.y0),
          x1: Math.max(bbox.x1, clipped.x1),
          y1: Math.max(bbox.y1, clipped.y1),
        }
      : clipped
  }
  const usedCm2 = bbox ? (bbox.x1 - bbox.x0) * (bbox.y1 - bbox.y0) : 0
  return { usedCm2, bbox }
}

/* ───────────── Utilidades ───────────── */

export function emptyDesign(productId: ProductId, colorId: string): Design {
  return { v: 1, productId, colorId, areas: {} }
}

export function layerCount(design: Design): number {
  return Object.values(design.areas).reduce((n, a) => n + a.layers.length, 0)
}

/** IDs de zonas con al menos una capa visible dentro de la zona imprimible. */
export function printedAreaIds(design: Design): string[] {
  const product = getProduct(design.productId)
  if (!product) return []
  return Object.entries(design.areas)
    .filter(([areaId, a]) => {
      const area = getArea(product, areaId)
      return area ? areaUsage(a.layers, area).usedCm2 > 0 : false
    })
    .map(([areaId]) => areaId)
}

/** IDs de archivos subidos (artes originales) que usa el diseño. */
export function designArtworkFileIds(design: Design): string[] {
  const ids = new Set<string>()
  for (const a of Object.values(design.areas))
    for (const l of a.layers) if (l.type === 'image') ids.add(l.fileId)
  return [...ids]
}

export type DesignCheck = { ok: true; design: Design } | { ok: false; error: string }

/** Valida un diseño recibido (p. ej. en la API) contra el catálogo. */
export function parseDesign(input: unknown): DesignCheck {
  const parsed = designSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'El diseño no es válido.' }
  const design = parsed.data
  const product = getProduct(design.productId)
  if (!product) return { ok: false, error: 'Producto desconocido.' }
  if (!getColor(product, design.colorId)) return { ok: false, error: 'Color no disponible para este producto.' }
  for (const areaId of Object.keys(design.areas)) {
    if (!getArea(product, areaId)) return { ok: false, error: `Zona de estampado desconocida: ${areaId}.` }
  }
  if (layerCount(design) > 80) return { ok: false, error: 'El diseño tiene demasiados elementos.' }
  return { ok: true, design }
}
