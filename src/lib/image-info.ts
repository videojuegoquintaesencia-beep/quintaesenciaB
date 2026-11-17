/**
 * Inspección estructural de imágenes subidas (PNG, JPEG, WebP). Código puro, sin dependencias.
 *
 * No basta con mirar los primeros bytes ("magic bytes"): 12 bytes con cabecera PNG o 12 MB de basura
 * con cabecera PNG se aceptarían. Aquí se recorre la estructura del formato, se leen las dimensiones
 * reales y se rechazan los archivos truncados, corruptos o con dimensiones absurdas.
 */

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp'

export interface ImageInfo {
  mime: ImageMime
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Lado máximo (px) y píxeles totales que aceptamos en cualquier imagen subida. */
export const MAX_IMAGE_SIDE_PX = 20_000
export const MAX_IMAGE_PIXELS = 120_000_000

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0

/* ───────────── PNG ───────────── */

/** Combinaciones válidas de tipo de color y profundidad de bits (especificación PNG). */
const PNG_DEPTHS: Record<number, number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
}

export interface PngInfo extends ImageInfo {
  mime: 'image/png'
  colorType: number
  bitDepth: number
  /** true si el PNG puede tener transparencia (canal alfa o chunk tRNS). */
  hasAlpha: boolean
}

/**
 * Lee la cabecera IHDR de un PNG y recorre todos los chunks hasta IEND comprobando que sus longitudes
 * encajan con el tamaño del archivo. Devuelve null si el archivo no es un PNG bien formado.
 */
export function inspectPng(bytes: Uint8Array): PngInfo | null {
  const n = bytes.length
  // firma (8) + IHDR (25) + IDAT mínimo (12 + 1) + IEND (12)
  if (n < 8 + 25 + 13 + 12) return null
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIGNATURE[i]) return null
  // IHDR: longitud 13, tipo "IHDR"
  if (u32(bytes, 8) !== 13 || u32(bytes, 12) !== 0x49484452) return null
  const width = u32(bytes, 16)
  const height = u32(bytes, 20)
  const bitDepth = bytes[24]
  const colorType = bytes[25]
  if (width < 1 || height < 1 || width > MAX_IMAGE_SIDE_PX || height > MAX_IMAGE_SIDE_PX) return null
  if (width * height > MAX_IMAGE_PIXELS) return null
  if (!PNG_DEPTHS[colorType]?.includes(bitDepth)) return null
  if (bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1) return null // compresión, filtro, entrelazado

  let pos = 8 + 25
  let hasIdat = false
  let hasTrns = false
  let hasPlte = false
  for (;;) {
    if (pos + 12 > n) return null
    const len = u32(bytes, pos)
    const type = u32(bytes, pos + 4)
    const next = pos + 12 + len
    if (len > 0x7fffffff || next > n) return null
    if (type === 0x49444154) hasIdat = true // IDAT
    else if (type === 0x74524e53) hasTrns = true // tRNS
    else if (type === 0x504c5445) hasPlte = true // PLTE
    else if (type === 0x49454e44) {
      // IEND: sin datos y debe ser el final del archivo
      return len === 0 && next === n && hasIdat && (colorType !== 3 || hasPlte)
        ? { mime: 'image/png', width, height, colorType, bitDepth, hasAlpha: colorType === 4 || colorType === 6 || hasTrns }
        : null
    }
    pos = next
  }
}

/** Lee solo ancho, alto y tipo de color de los primeros 33 bytes de un PNG (sin validar el resto). */
export function readPngHeader(head: Uint8Array): { width: number; height: number } | null {
  if (head.length < 24) return null
  for (let i = 0; i < 8; i++) if (head[i] !== PNG_SIGNATURE[i]) return null
  if (u32(head, 8) !== 13 || u32(head, 12) !== 0x49484452) return null
  const width = u32(head, 16)
  const height = u32(head, 20)
  return width > 0 && height > 0 ? { width, height } : null
}

/**
 * Resolución (ppp) anotada en un PNG (chunk pHYs en metros), o null si no la lleva. Basta con el comienzo del
 * archivo: pHYs debe ir antes de IDAT, y en los archivos del editor va justo detrás de IHDR.
 */
export function readPngDpi(head: Uint8Array): number | null {
  if (readPngHeader(head) === null) return null
  let pos = 8 + 25
  while (pos + 12 <= head.length) {
    const len = u32(head, pos)
    const type = u32(head, pos + 4)
    if (type === 0x70485973) {
      // pHYs: 4 bytes por metro en X, 4 en Y y 1 de unidad (1 = metro)
      if (len !== 9 || pos + 8 + 9 > head.length || head[pos + 16] !== 1) return null
      const perMeter = u32(head, pos + 8)
      return perMeter > 0 ? Math.round(perMeter * 0.0254) : null
    }
    if (type === 0x49444154) return null // IDAT: ya no puede haber pHYs
    pos += 12 + len
  }
  return null
}

/* ───────────── JPEG ───────────── */

function inspectJpeg(bytes: Uint8Array): ImageInfo | null {
  const n = bytes.length
  if (n < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null
  let pos = 2
  while (pos + 4 <= n) {
    if (bytes[pos] !== 0xff) return null
    let marker = bytes[pos + 1]
    // relleno: varios 0xFF seguidos antes del marcador
    while (marker === 0xff && pos + 2 < n) {
      pos++
      marker = bytes[pos + 1]
    }
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      pos += 2 // marcadores sin longitud
      continue
    }
    if (marker === 0xd9) return null // EOI antes de la imagen
    const len = (bytes[pos + 2] << 8) | bytes[pos + 3]
    if (len < 2 || pos + 2 + len > n) return null
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      if (len < 8) return null
      const height = (bytes[pos + 5] << 8) | bytes[pos + 6]
      const width = (bytes[pos + 7] << 8) | bytes[pos + 8]
      if (width < 1 || height < 1 || width * height > MAX_IMAGE_PIXELS) return null
      // Debe haber datos de imagen tras la cabecera (el scan empieza en el marcador SOS).
      let q = pos + 2 + len
      while (q + 4 <= n) {
        if (bytes[q] !== 0xff) return null
        const m = bytes[q + 1]
        if (m === 0xda) return n - q > 16 ? { mime: 'image/jpeg', width, height } : null
        if (m === 0xff) {
          q++
          continue
        }
        const l = (bytes[q + 2] << 8) | bytes[q + 3]
        if (l < 2 || q + 2 + l > n) return null
        q += 2 + l
      }
      return null
    }
    pos += 2 + len
  }
  return null
}

/* ───────────── WebP ───────────── */

function inspectWebp(bytes: Uint8Array): ImageInfo | null {
  const n = bytes.length
  if (n < 30) return null
  const tag = (o: number, s: string) => s.split('').every((c, i) => bytes[o + i] === c.charCodeAt(0))
  if (!tag(0, 'RIFF') || !tag(8, 'WEBP')) return null
  const riffSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)
  // El tamaño declarado debe caber en el archivo (se toleran bytes sobrantes al final).
  if (riffSize < 22 || riffSize + 8 > n + 1) return null
  const le24 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16)
  let width = 0
  let height = 0
  if (tag(12, 'VP8X')) {
    width = le24(24) + 1
    height = le24(27) + 1
  } else if (tag(12, 'VP8L')) {
    if (bytes[20] !== 0x2f) return null
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
    width = (bits & 0x3fff) + 1
    height = ((bits >>> 14) & 0x3fff) + 1
  } else if (tag(12, 'VP8 ')) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null
    width = (bytes[26] | (bytes[27] << 8)) & 0x3fff
    height = (bytes[28] | (bytes[29] << 8)) & 0x3fff
  } else return null
  if (width < 1 || height < 1 || width > MAX_IMAGE_SIDE_PX || height > MAX_IMAGE_SIDE_PX) return null
  if (width * height > MAX_IMAGE_PIXELS) return null
  return { mime: 'image/webp', width, height }
}

/**
 * Detecta y valida una imagen raster (PNG, JPEG o WebP). Devuelve null si no es una de ellas o si
 * está truncada/corrupta o declara dimensiones fuera de rango.
 */
export function inspectRaster(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return inspectPng(bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const jpeg = inspectJpeg(bytes)
    return jpeg && jpeg.width <= MAX_IMAGE_SIDE_PX && jpeg.height <= MAX_IMAGE_SIDE_PX ? jpeg : null
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return inspectWebp(bytes)
  return null
}
