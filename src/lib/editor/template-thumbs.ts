/**
 * Miniaturas de las plantillas sobre el producto y color actuales, dibujadas fuera de pantalla con Konva
 * (misma lógica que las vistas previas del carrito). Se generan de una en una, bajo demanda, y se guardan
 * en memoria por plantilla + producto + color + vista + zona para no repetir trabajo al volver a la pestaña.
 */
import { thumbnailCrop } from '@/components/templates/thumb-crop'
import type { PrintArea, Product, ProductView } from '@/config/products'
import { emptyDesign } from '@/lib/design'
import { templateFonts, type Template } from '@/lib/templates'
import { renderViewCanvas } from './export'
import { ensureFont } from './fonts'
import { measureText } from './text'

/** Ancho de la miniatura en píxeles CSS; se dibuja al doble para pantallas retina. */
const THUMB_WIDTH_PX = 260
const THUMB_PIXEL_RATIO = 2
const THUMB_QUALITY = 0.85
/** Tope de miniaturas en memoria (unos 20 KB cada una); al pasarse se descartan las más antiguas. */
const MAX_CACHED = 160

const cache = new Map<string, Promise<string>>()
/** Cola en serie: dibujar varias a la vez solo reparte el mismo trabajo y bloquea más el hilo principal. */
let queue: Promise<unknown> = Promise.resolve()

async function draw(template: Template, product: Product, colorId: string, view: ProductView, area: PrintArea): Promise<string> {
  await Promise.all(templateFonts(template).map((font) => ensureFont(font)))
  const layers = template.build(product, colorId, area, measureText)
  const design = { ...emptyDesign(product.id, colorId), areas: { [area.id]: { layers } } }
  const canvas = await renderViewCanvas(design, product, view, new Map(), {
    widthPx: THUMB_WIDTH_PX,
    pixelRatio: THUMB_PIXEL_RATIO,
    crop: thumbnailCrop(view, area),
  })
  // Si el navegador no codifica WebP (Safari), toDataURL devuelve un PNG y todo sigue igual.
  return canvas.toDataURL('image/webp', THUMB_QUALITY)
}

/** Data URL (WebP o PNG) de la plantilla aplicada a `area`, vista desde `view`. */
export function templateThumbnail(template: Template, product: Product, colorId: string, view: ProductView, area: PrintArea): Promise<string> {
  const key = [template.id, product.id, colorId, view.id, area.id].join('|')
  const hit = cache.get(key)
  if (hit) return hit
  const job = queue.then(() => draw(template, product, colorId, view, area))
  queue = job.catch(() => undefined)
  cache.set(key, job)
  job.catch(() => cache.delete(key))
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return job
}
