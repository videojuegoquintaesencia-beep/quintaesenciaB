/**
 * Carga y caché de las imágenes subidas por el cliente.
 * Siempre se descargan de /api/files/<id> (mismo origen) o de un blob local, así el canvas no se "contamina"
 * y se puede exportar. Para mostrarlas en pantalla se reducen si son muy grandes; la exportación usa el original.
 */
import { DISPLAY_MAX_SIDE_PX } from './constants'

export interface LoadedImage {
  fileId: string
  /** Imagen original a resolución completa (para exportar). */
  full: HTMLImageElement
  /** Versión ligera para el lienzo interactivo (la misma `full` si no hace falta reducir). */
  display: HTMLImageElement | HTMLCanvasElement
  naturalWidth: number
  naturalHeight: number
  /** SVG: se imprime nítido a cualquier tamaño. */
  vector: boolean
}

const cache = new Map<string, Promise<LoadedImage>>()

function decode(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    img.src = url
  })
}

interface SvgSize {
  width: number
  height: number
  text: string
}

/** Un SVG sin width/height no tiene tamaño propio en todos los navegadores: se lo damos a partir del viewBox. */
function normalizeSvg(source: string): SvgSize {
  const open = source.match(/<svg\b[^>]*>/i)
  if (!open) return { width: 512, height: 512, text: source }
  const tag = open[0]
  const attr = (name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
  const num = (v?: string) => {
    if (!v || v.includes('%')) return null
    const n = parseFloat(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const vb = attr('viewBox')?.split(/[\s,]+/).map(Number)
  const vbW = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : null
  const vbH = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : null
  let width = num(attr('width')) ?? vbW
  let height = num(attr('height')) ?? vbH
  if (!width && !height) {
    width = 512
    height = 512
  } else if (!width) width = (height as number) * ((vbW ?? 1) / (vbH ?? 1))
  else if (!height) height = width * ((vbH ?? 1) / (vbW ?? 1))
  const scale = Math.max(1, 1024 / Math.max(width as number, height as number))
  const w = Math.round((width as number) * scale)
  const h = Math.round((height as number) * scale)
  const stripped = tag.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '')
  const withSize = stripped.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`)
  const hasViewBox = /\sviewBox\s*=/i.test(withSize)
  const fixed = hasViewBox ? withSize : withSize.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`)
  return { width: w, height: h, text: source.replace(tag, fixed) }
}

function toDisplay(img: HTMLImageElement, vector: boolean): HTMLImageElement | HTMLCanvasElement {
  const side = Math.max(img.naturalWidth, img.naturalHeight)
  if (vector || side <= DISPLAY_MAX_SIDE_PX) return img
  const k = DISPLAY_MAX_SIDE_PX / side
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k))
  const ctx = canvas.getContext('2d')
  if (!ctx) return img
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function decodeBlob(fileId: string, blob: Blob): Promise<LoadedImage> {
  const vector = blob.type === 'image/svg+xml'
  let source = blob
  let svgSize: SvgSize | null = null
  if (vector) {
    svgSize = normalizeSvg(await blob.text())
    source = new Blob([svgSize.text], { type: 'image/svg+xml' })
  }
  const url = URL.createObjectURL(source)
  try {
    const full = await decode(url)
    const naturalWidth = svgSize?.width ?? full.naturalWidth
    const naturalHeight = svgSize?.height ?? full.naturalHeight
    if (!naturalWidth || !naturalHeight) throw new Error('La imagen está vacía.')
    return { fileId, full, display: toDisplay(full, vector), naturalWidth, naturalHeight, vector }
  } finally {
    // La imagen ya está decodificada en memoria; el blob local ya no hace falta.
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}

/** Guarda en caché una imagen recién subida (se decodifica desde el archivo local, sin volver a pedirla). */
export function primeImage(fileId: string, blob: Blob): Promise<LoadedImage> {
  const promise = decodeBlob(fileId, blob)
  promise.catch(() => cache.delete(fileId))
  cache.set(fileId, promise)
  return promise
}

/** Carga una imagen ya subida desde el servidor (o de la caché). */
export function loadFileImage(fileId: string): Promise<LoadedImage> {
  const existing = cache.get(fileId)
  if (existing) return existing
  const promise = fetch(`/api/files/${fileId}`)
    .then((res) => {
      if (!res.ok) throw new Error('La imagen ya no está disponible.')
      return res.blob()
    })
    .then((blob) => decodeBlob(fileId, blob))
  promise.catch(() => cache.delete(fileId))
  cache.set(fileId, promise)
  return promise
}
