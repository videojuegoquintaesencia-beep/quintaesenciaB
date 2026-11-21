/**
 * Modelo de lectura de una línea de pedido para el panel: agrupa por vista del producto (delante, detrás…),
 * calcula la caja envolvente real de cada estampado en cm y resume las capas del diseño.
 * Es código puro (sin acceso a la base de datos) para poder usarlo en la ficha y en la hoja de producción.
 */
import { getArea, getProduct, type Product } from '@/config/products'
import { areaUsage, designArtworkFileIds, FONTS, type Layer } from '@/lib/design'
import type { FileMeta } from '@/lib/files'
import type { OrderItem } from '@/lib/orders'

/** Presupuesto del que procede un pedido, con sus adjuntos (las líneas de presupuesto no llevan archivos propios). */
export interface QuoteSource {
  id: string
  number: string
  files: FileMeta[]
}

/** true si la línea trae un desglose por tallas (y no solo "unica"). */
export function hasSizeBreakdown(item: Pick<OrderItem, 'sizes'>): boolean {
  return Object.entries(item.sizes).some(([size, qty]) => size !== 'unica' && qty > 0)
}

export interface PlacementView {
  areaId: string
  label: string
  /** Superficie usada (la que se cobró) en cm². */
  usedCm2: number
  chargeCents: number
  /** Caja envolvente del diseño dentro de la zona, en cm. */
  bboxCm: { width: number; height: number } | null
  /** Tamaño máximo imprimible de la zona, en cm. */
  maxCm: { width: number; height: number } | null
  printFileId: string | null
  /** Resumen legible de las capas (textos, imágenes, pegatinas). */
  layers: string[]
}

export interface ViewGroup {
  viewId: string
  label: string
  /** Proporciones de la imagen de la vista (viewBox del mockup). */
  imageSize: { width: number; height: number }
  previewFileId: string | null
  placements: PlacementView[]
}

export interface SizeRow {
  id: string
  label: string
  qty: number
}

export interface ItemView {
  product: Product | undefined
  /** Solo las tallas con unidades, en el orden del catálogo. */
  sizeRows: SizeRow[]
  groups: ViewGroup[]
  artworkFileIds: string[]
}

const DEFAULT_IMAGE_SIZE = { width: 600, height: 700 }

export function describeLayer(layer: Layer): string {
  switch (layer.type) {
    case 'text':
      return `Texto «${layer.text.replace(/\s+/g, ' ').trim()}» · ${FONTS[layer.font]?.label ?? layer.font}`
    case 'image':
      return `Imagen${layer.name ? `: ${layer.name}` : ''}`
    case 'sticker':
      return `Pegatina: ${layer.stickerId}`
  }
}

function sizeRows(item: OrderItem, product: Product | undefined): SizeRow[] {
  const labels = new Map(product?.sizes.map((s) => [s.id, s.label]) ?? [])
  const order = product?.sizes.map((s) => s.id) ?? []
  const entries = Object.entries(item.sizes).filter(([, qty]) => qty > 0)
  entries.sort(([a], [b]) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return entries.map(([id, qty]) => ({ id, label: labels.get(id) ?? (id === 'unica' ? 'Talla única' : id), qty }))
}

export function buildItemView(item: OrderItem): ItemView {
  const product = getProduct(item.productId)

  const placements = item.prints.map((print) => {
    const area = product ? getArea(product, print.areaId) : undefined
    const layers = item.design?.areas[print.areaId]?.layers ?? []
    const usage = area ? areaUsage(layers, area) : null
    const view: PlacementView = {
      areaId: print.areaId,
      label: print.label,
      usedCm2: print.usedCm2,
      chargeCents: print.cents,
      bboxCm: usage?.bbox ? { width: usage.bbox.x1 - usage.bbox.x0, height: usage.bbox.y1 - usage.bbox.y0 } : null,
      maxCm: area ? { width: area.widthCm, height: area.heightCm } : null,
      printFileId: item.printFiles[print.areaId] ?? null,
      layers: layers.map(describeLayer),
    }
    return { viewId: area?.viewId ?? null, view }
  })

  const groups: ViewGroup[] = []
  const viewIds = [...(product?.views.map((v) => v.id) ?? []), ...Object.keys(item.previews)]
  for (const viewId of new Set(viewIds)) {
    const productView = product?.views.find((v) => v.id === viewId)
    const inView = placements.filter((p) => p.viewId === viewId).map((p) => p.view)
    const previewFileId = item.previews[viewId] ?? null
    if (!previewFileId && inView.length === 0) continue
    groups.push({
      viewId,
      label: productView?.label ?? viewId,
      imageSize: productView?.viewBox ?? DEFAULT_IMAGE_SIZE,
      previewFileId,
      placements: inView,
    })
  }
  const orphans = placements
    .filter((p) => !p.viewId || !groups.some((g) => g.viewId === p.viewId))
    .map((p) => p.view)
  if (orphans.length) groups.push({ viewId: 'otros', label: 'Otras zonas', imageSize: DEFAULT_IMAGE_SIZE, previewFileId: null, placements: orphans })

  return {
    product,
    sizeRows: sizeRows(item, product),
    groups,
    // Las líneas de presupuesto no llevan diseño (sus adjuntos están en el presupuesto).
    artworkFileIds: item.design ? designArtworkFileIds(item.design) : [],
  }
}

/** "24,3 × 31,2 cm" */
export function formatSizeCm(size: { width: number; height: number } | null): string {
  if (!size) return '—'
  const fmt = (n: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(n)
  return `${fmt(size.width)} × ${fmt(size.height)} cm`
}

export function formatCm2(value: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)} cm²`
}
