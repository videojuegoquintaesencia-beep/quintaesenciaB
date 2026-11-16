/**
 * Exportación del diseño: vistas previas del producto con el arte y archivos de impresión
 * (PNG transparente recortado al contenido, a 300 ppp). Todo se dibuja con nodos Konva sin pantalla,
 * así que no toca el estado de la interfaz.
 */
import Konva from 'konva'
import { mockupDataUrl } from '@/components/mockups'
import { getArea, getColor, getProduct, getView, type PrintArea, type Product, type ProductView } from '@/config/products'
import { areaUsage, designArtworkFileIds, type Design } from '@/lib/design'
import { MAX_PRINT_PIXELS, MIN_PRINT_DPI, PREVIEW_WIDTH_PX, PRINT_DPI } from './constants'
import { CM_PER_INCH, round1 } from './geometry'
import { loadFileImage, type LoadedImage } from './images'
import { ensureFont } from './fonts'
import { buildLayerNode } from './nodes'
import { uploadFile } from './upload'

type ImageMap = Map<string, LoadedImage>

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('El navegador no pudo generar la imagen.'))), 'image/png')
  })
}

function rasterize(root: Konva.Group, width: number, height: number): HTMLCanvasElement {
  const canvas = root.toCanvas({ x: 0, y: 0, width, height, pixelRatio: 1 }) as HTMLCanvasElement
  root.destroy()
  return canvas
}

function loadMockup(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo dibujar la imagen del producto.'))
    img.src = src
  })
}

/** Imagen del producto (con el arte aplicado y recortado a cada zona) de una vista. */
export async function renderPreview(design: Design, product: Product, view: ProductView, images: ImageMap): Promise<Blob> {
  const color = getColor(product, design.colorId)
  if (!color) throw new Error('Color no disponible.')
  const mockup = await loadMockup(mockupDataUrl({ productId: product.id, viewId: view.id, colorHex: color.hex, guides: false }))
  const scale = PREVIEW_WIDTH_PX / view.viewBox.width
  const width = PREVIEW_WIDTH_PX
  const height = Math.round(view.viewBox.height * scale)

  const root = new Konva.Group({ scaleX: scale, scaleY: scale })
  root.add(new Konva.Image({ image: mockup, x: 0, y: 0, width: view.viewBox.width, height: view.viewBox.height }))
  for (const area of view.areas) {
    const layers = design.areas[area.id]?.layers ?? []
    if (layers.length === 0) continue
    const w = area.widthCm * view.pxPerCm
    const h = area.heightCm * view.pxPerCm
    const holder = new Konva.Group({
      x: area.center.x - w / 2,
      y: area.center.y - h / 2,
      clipX: 0,
      clipY: 0,
      clipWidth: w,
      clipHeight: h,
    })
    for (const layer of layers) {
      holder.add(buildLayerNode(layer, view.pxPerCm, layer.type === 'image' ? images.get(layer.fileId) : null))
    }
    root.add(holder)
  }
  return canvasToBlob(rasterize(root, width, height))
}

export interface PrintRender {
  blob: Blob
  name: string
  widthPx: number
  heightPx: number
  dpi: number
}

/** PNG transparente listo para imprimir, recortado a la caja del arte dentro de la zona. */
export async function renderPrintFile(
  design: Design,
  product: Product,
  area: PrintArea,
  images: ImageMap,
): Promise<PrintRender | null> {
  const layers = design.areas[area.id]?.layers ?? []
  const { bbox } = areaUsage(layers, area)
  if (!bbox) return null
  const wCm = bbox.x1 - bbox.x0
  const hCm = bbox.y1 - bbox.y0

  let dpi = PRINT_DPI
  if (wCm * hCm * (dpi / CM_PER_INCH) ** 2 > MAX_PRINT_PIXELS) {
    dpi = Math.max(MIN_PRINT_DPI, Math.floor(CM_PER_INCH * Math.sqrt(MAX_PRINT_PIXELS / (wCm * hCm))))
  }
  const ppc = dpi / CM_PER_INCH
  const widthPx = Math.max(1, Math.ceil(wCm * ppc))
  const heightPx = Math.max(1, Math.ceil(hCm * ppc))

  const root = new Konva.Group()
  const holder = new Konva.Group({ x: -bbox.x0 * ppc, y: -bbox.y0 * ppc })
  for (const layer of layers) {
    holder.add(buildLayerNode(layer, ppc, layer.type === 'image' ? images.get(layer.fileId) : null))
  }
  root.add(holder)
  const blob = await canvasToBlob(rasterize(root, widthPx, heightPx))
  return { blob, name: `${product.id}-${area.id}-${round1(wCm)}x${round1(hCm)}cm.png`, widthPx, heightPx, dpi }
}

/* ───────────── Flujo completo: render + subida ───────────── */

/** Archivos ya subidos de un intento anterior (se reutilizan al reintentar si el diseño no cambió). */
export type ExportCache = Map<string, { sig: string; fileId: string }>

export interface ExportResult {
  previews: Record<string, string>
  printFiles: Record<string, string>
}

export interface ExportProgress {
  done: number
  total: number
}

/** Carga todo lo que el diseño necesita (imágenes y tipografías) antes de dibujar. */
async function prepareAssets(design: Design): Promise<ImageMap> {
  const images: ImageMap = new Map()
  const fonts = new Set<Parameters<typeof ensureFont>[0]>()
  for (const area of Object.values(design.areas)) {
    for (const layer of area.layers) if (layer.type === 'text') fonts.add(layer.font)
  }
  await Promise.all([...fonts].map((f) => ensureFont(f)))
  try {
    await Promise.all(
      designArtworkFileIds(design).map(async (id) => {
        images.set(id, await loadFileImage(id))
      }),
    )
  } catch {
    throw new Error('Una de las imágenes del diseño ya no está disponible. Elimínala y vuelve a subirla.')
  }
  return images
}

export async function exportDesignFiles(
  design: Design,
  cache: ExportCache,
  onProgress: (p: ExportProgress) => void,
): Promise<ExportResult> {
  const product = getProduct(design.productId)
  if (!product) throw new Error('Producto desconocido.')
  const images = await prepareAssets(design)

  // Zonas con arte dentro del área imprimible y vistas que las contienen.
  const printed = Object.entries(design.areas)
    .map(([areaId, data]) => ({ area: getArea(product, areaId), layers: data.layers }))
    .filter((x): x is { area: NonNullable<typeof x.area>; layers: typeof x.layers } => !!x.area && areaUsage(x.layers, x.area).usedCm2 > 0)
  const viewIds = [...new Set(printed.map((p) => p.area.viewId))]

  const total = viewIds.length + printed.length
  let done = 0
  onProgress({ done, total })

  const previews: Record<string, string> = {}
  const printFiles: Record<string, string> = {}

  for (const viewId of viewIds) {
    const view = getView(product, viewId)
    if (!view) continue
    const sig = JSON.stringify([design.colorId, view.areas.map((a) => design.areas[a.id]?.layers ?? [])])
    const hit = cache.get(`preview:${viewId}`)
    if (hit && hit.sig === sig) {
      previews[viewId] = hit.fileId
    } else {
      const blob = await renderPreview(design, product, view, images)
      const uploaded = await uploadFile(blob, 'preview', { name: `${product.id}-${viewId}-vista.png` })
      cache.set(`preview:${viewId}`, { sig, fileId: uploaded.id })
      previews[viewId] = uploaded.id
    }
    onProgress({ done: ++done, total })
  }

  for (const { area, layers } of printed) {
    const sig = JSON.stringify(layers)
    const hit = cache.get(`print:${area.id}`)
    if (hit && hit.sig === sig) {
      printFiles[area.id] = hit.fileId
    } else {
      const render = await renderPrintFile(design, product, area, images)
      if (!render) continue
      const uploaded = await uploadFile(render.blob, 'print', { name: render.name })
      cache.set(`print:${area.id}`, { sig, fileId: uploaded.id })
      printFiles[area.id] = uploaded.id
    }
    onProgress({ done: ++done, total })
  }

  return { previews, printFiles }
}
