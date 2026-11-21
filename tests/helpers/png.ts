/**
 * Generador de PNG mínimos sin dependencias (zlib + CRC32), compartido por las pruebas unitarias, de integración
 * y E2E. Produce archivos bien formados: los acepta `inspectPng` y el servidor los admite como subida.
 */
import { deflateSync } from 'node:zlib'

export const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/** Chunk PNG completo: longitud + tipo + datos + CRC (del tipo y los datos). */
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

export type PngColorType = 0 | 2 | 3 | 4 | 6
const CHANNELS: Record<PngColorType, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

export interface PngOptions {
  width: number
  height: number
  /** 0 gris, 2 RGB, 3 paleta, 4 gris+alfa, 6 RGBA (por defecto). */
  colorType?: PngColorType
  bitDepth?: number
  interlace?: number
  /** Chunks adicionales entre IHDR e IDAT (PLTE, tRNS, pHYs…). */
  extraChunks?: Uint8Array[]
  /** Valor de cada píxel (un número por canal). Por defecto todo a cero (transparente en RGBA, negro en RGB). */
  pixel?: (x: number, y: number) => number[]
}

/** PNG de 8 bits bien formado. Solo el IHDR, IDAT e IEND imprescindibles salvo que se pidan chunks extra. */
export function encodePng(opts: PngOptions): Uint8Array {
  const { width, height, colorType = 6, bitDepth = 8, interlace = 0 } = opts
  const channels = CHANNELS[colorType]
  const stride = width * channels + 1 // byte de filtro (0 = ninguno) + píxeles
  const raw = new Uint8Array(stride * height)
  if (opts.pixel) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) raw.set(opts.pixel(x, y).slice(0, channels), y * stride + 1 + x * channels)
    }
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = bitDepth
  ihdr[9] = colorType
  ihdr[10] = 0 // compresión
  ihdr[11] = 0 // filtro
  ihdr[12] = interlace
  return concatBytes([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    ...(opts.extraChunks ?? []),
    pngChunk('IDAT', new Uint8Array(deflateSync(raw))),
    pngChunk('IEND', new Uint8Array(0)),
  ])
}

/** Tipos de chunk de un PNG, en orden ("IHDR", "pHYs", "IDAT", "IEND"…). */
export function pngChunkTypes(png: Uint8Array): string[] {
  const types: string[] = []
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let pos = 8
  while (pos + 12 <= png.length) {
    const len = view.getUint32(pos)
    types.push(String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]))
    pos += 12 + len
  }
  return types
}
