import { describe, expect, it } from 'vitest'
import { blobWithPngDpi, withPngDpi } from '@/lib/editor/png-meta'
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE_PX, inspectPng, inspectRaster, readPngDpi, readPngHeader } from '@/lib/image-info'
import { concatBytes, encodePng, pngChunk, pngChunkTypes } from '../helpers/png'

/* ───────────── Constructores de otros formatos ───────────── */

/** JPEG mínimo: SOI, APP0 (con relleno para pasar de 100 bytes), SOF0 con las dimensiones, SOS, datos y EOI. */
function jpeg({ width, height, truncateBeforeScan = false, eoiFirst = false }: { width: number; height: number; truncateBeforeScan?: boolean; eoiFirst?: boolean }): Uint8Array {
  const seg = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload]
  const app0 = seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0, ...new Array<number>(80).fill(0)])
  const sof0 = seg(0xc0, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
  const sos = seg(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0])
  const scan = new Array<number>(40).fill(0x55)
  if (eoiFirst) return Uint8Array.from([0xff, 0xd8, ...app0, 0xff, 0xd9, ...sof0, ...sos, ...scan])
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof0, ...(truncateBeforeScan ? [] : [...sos, ...scan, 0xff, 0xd9])])
}

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))
const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
const le24 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff]

function riff(chunk: number[], riffSizeOverride?: number): Uint8Array {
  const size = riffSizeOverride ?? 4 + chunk.length
  return Uint8Array.from([...ascii('RIFF'), ...le32(size), ...ascii('WEBP'), ...chunk])
}

function webpLossless(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14)
  const payload = [0x2f, ...le32(bits), 0, 0, 0, 0, 0]
  return riff([...ascii('VP8L'), ...le32(payload.length), ...payload])
}

function webpExtended(width: number, height: number): Uint8Array {
  const payload = [0x10, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]
  return riff([...ascii('VP8X'), ...le32(payload.length), ...payload])
}

function webpLossy(width: number, height: number): Uint8Array {
  const payload = [0x00, 0x00, 0x00, 0x9d, 0x01, 0x2a, width & 0xff, (width >> 8) & 0x3f, height & 0xff, (height >> 8) & 0x3f]
  return riff([...ascii('VP8 '), ...le32(payload.length), ...payload])
}

/* ───────────── PNG ───────────── */

describe('inspectPng / readPngHeader', () => {
  it('lee dimensiones, tipo de color y transparencia de un PNG RGBA bien formado', () => {
    const png = encodePng({ width: 4, height: 3 })
    expect(inspectPng(png)).toEqual({ mime: 'image/png', width: 4, height: 3, colorType: 6, bitDepth: 8, hasAlpha: true })
    expect(readPngHeader(png.subarray(0, 33))).toEqual({ width: 4, height: 3 })
    expect(inspectRaster(png)?.mime).toBe('image/png')
  })

  it('un PNG RGB no tiene alfa salvo que lleve un chunk tRNS', () => {
    expect(inspectPng(encodePng({ width: 2, height: 2, colorType: 2 }))?.hasAlpha).toBe(false)
    const trns = pngChunk('tRNS', new Uint8Array(6))
    expect(inspectPng(encodePng({ width: 2, height: 2, colorType: 2, extraChunks: [trns] }))?.hasAlpha).toBe(true)
  })

  it('un PNG de paleta necesita su PLTE', () => {
    expect(inspectPng(encodePng({ width: 2, height: 2, colorType: 3 }))).toBeNull()
    const plte = pngChunk('PLTE', new Uint8Array([255, 0, 0]))
    expect(inspectPng(encodePng({ width: 2, height: 2, colorType: 3, extraChunks: [plte] }))?.colorType).toBe(3)
  })

  it.each<[string, (png: Uint8Array) => Uint8Array]>([
    ['truncado a mitad', (png) => png.subarray(0, png.length - 10)],
    ['con basura después de IEND', (png) => concatBytes([png, new Uint8Array([1, 2, 3])])],
    ['con la firma alterada', (png) => Uint8Array.from(png, (b, i) => (i === 1 ? 0x51 : b))],
    ['con un chunk cuya longitud se sale del archivo', (png) => { const copy = Uint8Array.from(png); copy[33] = 0x7f; return copy }],
  ])('rechaza un PNG %s', (_name, mutate) => {
    expect(inspectPng(mutate(encodePng({ width: 4, height: 4 })))).toBeNull()
  })

  it('rechaza un PNG sin datos de imagen (sin IDAT)', () => {
    const png = encodePng({ width: 4, height: 4 })
    // Quita el IDAT: firma + IHDR (33 bytes) + IEND (últimos 12)
    const sinIdat = concatBytes([png.subarray(0, 33), png.subarray(png.length - 12)])
    expect(inspectPng(sinIdat)).toBeNull()
  })

  it('rechaza cabeceras imposibles: dimensiones cero, profundidad inválida o entrelazado desconocido', () => {
    expect(inspectPng(encodePng({ width: 0, height: 4 }))).toBeNull()
    expect(inspectPng(encodePng({ width: 4, height: 4, bitDepth: 4 }))).toBeNull() // RGBA solo admite 8 o 16
    expect(inspectPng(encodePng({ width: 4, height: 4, interlace: 2 }))).toBeNull()
  })

  it('rechaza "bombas" de píxeles sin descomprimir nada', () => {
    // Solo se manipula la cabecera: los datos no importan para la comprobación de tamaño
    const fake = (width: number, height: number) => {
      const png = encodePng({ width: 1, height: 1 })
      const view = new DataView(png.buffer, png.byteOffset)
      view.setUint32(16, width)
      view.setUint32(20, height)
      return png
    }
    expect(inspectPng(fake(MAX_IMAGE_SIDE_PX + 1, 1))).toBeNull()
    expect(inspectPng(fake(11000, 11000))).toBeNull() // 121 M píxeles > MAX_IMAGE_PIXELS
    expect(11000 * 11000).toBeGreaterThan(MAX_IMAGE_PIXELS)
    expect(inspectPng(fake(10000, 10000))?.width).toBe(10000) // 100 M, dentro del tope
  })

  it('readPngHeader no exige el archivo completo pero sí una cabecera correcta', () => {
    expect(readPngHeader(new Uint8Array(10))).toBeNull()
    const png = encodePng({ width: 7, height: 9 })
    expect(readPngHeader(png.subarray(0, 24))).toEqual({ width: 7, height: 9 })
  })
})

describe('pHYs: withPngDpi y readPngDpi (ida y vuelta)', () => {
  it('inserta el chunk justo después de IHDR y se lee con los mismos ppp', () => {
    const png = encodePng({ width: 4, height: 4 })
    expect(readPngDpi(png)).toBeNull()
    const tagged = withPngDpi(png, 300)
    expect(pngChunkTypes(tagged)).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND'])
    expect(readPngDpi(tagged.subarray(0, 96))).toBe(300)
    expect(inspectPng(tagged)).toMatchObject({ width: 4, height: 4 })
  })

  it.each([72, 150, 220, 290, 300])('%i ppp sobrevive a la conversión a píxeles por metro', (dpi) => {
    expect(readPngDpi(withPngDpi(encodePng({ width: 2, height: 2 }), dpi))).toBe(dpi)
  })

  it('aplicarlo dos veces sustituye el pHYs anterior en lugar de duplicarlo', () => {
    const twice = withPngDpi(withPngDpi(encodePng({ width: 2, height: 2 }), 300), 150)
    expect(pngChunkTypes(twice).filter((t) => t === 'pHYs')).toHaveLength(1)
    expect(readPngDpi(twice)).toBe(150)
  })

  it('devuelve los bytes intactos si no son un PNG, están truncados o los ppp no valen', () => {
    const png = encodePng({ width: 2, height: 2 })
    expect(withPngDpi(png, 0)).toBe(png)
    expect(withPngDpi(png, Number.NaN)).toBe(png)
    const text = new TextEncoder().encode('no soy un png, pero soy bastante largo para la comprobación de tamaño')
    expect(withPngDpi(text, 300)).toBe(text)
    const truncated = png.subarray(0, png.length - 5)
    expect(withPngDpi(truncated, 300)).toBe(truncated)
  })

  it('readPngDpi ignora un pHYs en unidades desconocidas y deja de buscar al llegar a IDAT', () => {
    const data = new Uint8Array(9)
    new DataView(data.buffer).setUint32(0, 11811)
    new DataView(data.buffer).setUint32(4, 11811)
    data[8] = 0 // unidad desconocida
    expect(readPngDpi(encodePng({ width: 2, height: 2, extraChunks: [pngChunk('pHYs', data)] }))).toBeNull()
    // Un pHYs después de IDAT no cuenta (y no es un PNG válido según la especificación)
    const png = encodePng({ width: 2, height: 2 })
    const late = concatBytes([png.subarray(0, png.length - 12), pngChunk('pHYs', data), png.subarray(png.length - 12)])
    expect(readPngDpi(late)).toBeNull()
  })

  it('blobWithPngDpi etiqueta un Blob PNG y deja intactos los demás', async () => {
    const png = encodePng({ width: 2, height: 2 })
    const out = await blobWithPngDpi(new Blob([png as BlobPart]), 300)
    expect(out.type).toBe('image/png')
    expect(readPngDpi(new Uint8Array(await out.arrayBuffer()))).toBe(300)
    const other = new Blob(['hola'])
    expect(await blobWithPngDpi(other, 300)).toBe(other)
  })
})

/* ───────────── JPEG y WebP ───────────── */

describe('inspectRaster con JPEG', () => {
  it('lee las dimensiones de un JPEG completo', () => {
    expect(inspectRaster(jpeg({ width: 640, height: 480 }))).toEqual({ mime: 'image/jpeg', width: 640, height: 480 })
  })

  it('rechaza un JPEG truncado antes de los datos de imagen o terminado antes de la cabecera', () => {
    expect(inspectRaster(jpeg({ width: 640, height: 480, truncateBeforeScan: true }))).toBeNull()
    expect(inspectRaster(jpeg({ width: 640, height: 480, eoiFirst: true }))).toBeNull()
  })

  it('rechaza dimensiones fuera de rango', () => {
    expect(inspectRaster(jpeg({ width: 0, height: 10 }))).toBeNull()
    expect(inspectRaster(jpeg({ width: 65535, height: 65535 }))).toBeNull()
    expect(inspectRaster(jpeg({ width: 20001, height: 10 }))).toBeNull()
  })
})

describe('inspectRaster con WebP', () => {
  it('lee las dimensiones en los tres tipos de contenedor', () => {
    expect(inspectRaster(webpLossless(300, 200))).toEqual({ mime: 'image/webp', width: 300, height: 200 })
    expect(inspectRaster(webpExtended(1024, 768))).toEqual({ mime: 'image/webp', width: 1024, height: 768 })
    expect(inspectRaster(webpLossy(640, 360))).toEqual({ mime: 'image/webp', width: 640, height: 360 })
  })

  it('rechaza tamaños RIFF incoherentes, firmas incorrectas y dimensiones excesivas', () => {
    const bad = riff([...ascii('VP8L'), ...le32(10), 0x2f, 0, 0, 0, 0, 0, 0, 0, 0, 0], 9999)
    expect(inspectRaster(bad)).toBeNull()
    const notWebp = Uint8Array.from([...ascii('RIFF'), ...le32(22), ...ascii('WAVE'), ...new Array<number>(18).fill(0)])
    expect(inspectRaster(notWebp)).toBeNull()
    expect(inspectRaster(webpExtended(20001, 10))).toBeNull()
    expect(inspectRaster(webpExtended(16000, 16000))).toBeNull() // 256 M píxeles
  })
})

describe('inspectRaster con otros contenidos', () => {
  it('devuelve null con archivos demasiado cortos o de formatos desconocidos', () => {
    expect(inspectRaster(new Uint8Array(5))).toBeNull()
    expect(inspectRaster(new TextEncoder().encode('GIF89a..........'))).toBeNull()
    expect(inspectRaster(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
  })
})
