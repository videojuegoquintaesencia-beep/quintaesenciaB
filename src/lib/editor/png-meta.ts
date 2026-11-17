/**
 * Metadatos de resolución de un PNG (chunk `pHYs`).
 *
 * `canvas.toBlob` genera PNG sin ese chunk, así que Photoshop, un RIP o el software de DTF abren el archivo a
 * 72/96 ppp y le calculan un tamaño físico absurdo (un diseño de 21 cm sale con casi 90 cm). Aquí se inserta
 * justo después de IHDR con los ppp reales con los que se renderizó el archivo. Código puro, sin dependencias.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const CHUNK_PHYS = 0x70485973 // "pHYs"
const METERS_PER_INCH = 0.0254

let crcTable: Uint32Array | null = null

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const readU32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0

function writeU32(b: Uint8Array, o: number, v: number) {
  b[o] = v >>> 24
  b[o + 1] = (v >>> 16) & 0xff
  b[o + 2] = (v >>> 8) & 0xff
  b[o + 3] = v & 0xff
}

/** Chunk pHYs completo (longitud + tipo + 9 bytes de datos + CRC) para `dpi` ppp en ambos ejes. */
function physChunk(dpi: number): Uint8Array {
  const perMeter = Math.round(dpi / METERS_PER_INCH)
  const chunk = new Uint8Array(21)
  writeU32(chunk, 0, 9)
  writeU32(chunk, 4, CHUNK_PHYS)
  writeU32(chunk, 8, perMeter)
  writeU32(chunk, 12, perMeter)
  chunk[16] = 1 // unidad: metro
  writeU32(chunk, 17, crc32(chunk.subarray(4, 17)))
  return chunk
}

/**
 * Devuelve el PNG con un único chunk pHYs a `dpi` ppp, colocado tras IHDR (y quitando cualquier pHYs previo).
 * Si los bytes no son un PNG reconocible, se devuelven tal cual.
 */
export function withPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const n = png.length
  if (n < 8 + 25 || !Number.isFinite(dpi) || dpi <= 0) return png
  for (let i = 0; i < 8; i++) if (png[i] !== PNG_SIGNATURE[i]) return png
  if (readU32(png, 8) !== 13 || readU32(png, 12) !== 0x49484452) return png

  const ihdrEnd = 8 + 25
  const parts: Uint8Array[] = [png.subarray(0, ihdrEnd), physChunk(dpi)]
  let pos = ihdrEnd
  while (pos + 12 <= n) {
    const next = pos + 12 + readU32(png, pos)
    if (next > n) return png // chunk truncado: no tocar
    if (readU32(png, pos + 4) !== CHUNK_PHYS) parts.push(png.subarray(pos, next))
    pos = next
  }
  if (pos !== n) return png

  const out = new Uint8Array(parts.reduce((total, p) => total + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/** Igual que `withPngDpi`, sobre un Blob PNG. Si algo falla, devuelve el Blob original. */
export async function blobWithPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const tagged = withPngDpi(bytes, dpi)
    return tagged === bytes ? blob : new Blob([tagged as BlobPart], { type: 'image/png' })
  } catch {
    return blob
  }
}
