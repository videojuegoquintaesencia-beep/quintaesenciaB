/**
 * Archivos subidos (artes del cliente, previsualizaciones y archivos de impresión).
 * Se guardan en la base de datos como BLOB y se sirven por /api/files/[id].
 */
import 'server-only'
import { site } from '@/config/site'
import { getDb, nowIso } from './db'
import { MAX_PRINT_PIXELS } from './editor/constants'
import { inspectRaster, readPngDpi, readPngHeader } from './image-info'
import { newId } from './ids'
import { checkSvg } from './svg-safety'

export const FILE_KINDS = ['artwork', 'preview', 'print', 'quote'] as const
export type FileKind = (typeof FILE_KINDS)[number]

export interface StoredFile {
  id: string
  kind: FileKind
  name: string | null
  mime: string
  size: number
  bytes: Uint8Array
  orderId: string | null
  quoteId: string | null
  createdAt: string
}

export type FileMeta = Omit<StoredFile, 'bytes'>

export type UploadInspection =
  | { ok: true; mime: (typeof site.uploads.acceptedArtworkTypes)[number]; width: number | null; height: number | null }
  | { ok: false; status: 400 | 415; error: string }

const UNSUPPORTED = 'Formato no admitido. Sube una imagen PNG, JPG, WebP o SVG.'

/** Píxeles máximos según el tipo de archivo (los generados por el editor tienen tamaños acotados). */
const MAX_PIXELS_BY_KIND: Partial<Record<FileKind, number>> = {
  print: Math.round(MAX_PRINT_PIXELS * 1.1),
  preview: 4_000_000,
}

/**
 * Valida un archivo subido por su ESTRUCTURA, no solo por los primeros bytes: un PNG/JPEG/WebP debe estar
 * completo y con dimensiones razonables (rechaza basura con cabecera de imagen y "bombas" de píxeles), y un
 * SVG solo puede contener elementos y atributos de una lista blanca.
 */
export function inspectUpload(kind: FileKind, bytes: Uint8Array): UploadInspection {
  const looksRaster =
    bytes.length >= 12 &&
    ((bytes[0] === 0x89 && bytes[1] === 0x50) || (bytes[0] === 0xff && bytes[1] === 0xd8) || (bytes[0] === 0x52 && bytes[1] === 0x49))
  if (looksRaster) {
    const info = inspectRaster(bytes)
    if (!info) {
      return {
        ok: false,
        status: 400,
        error: 'No podemos leer esa imagen: parece dañada o incompleta. Expórtala de nuevo como PNG, JPG o WebP e inténtalo otra vez.',
      }
    }
    if (kind === 'print' && info.mime !== 'image/png') return { ok: false, status: 415, error: 'El archivo de impresión debe ser PNG.' }
    const maxPixels = MAX_PIXELS_BY_KIND[kind]
    if (maxPixels && info.width * info.height > maxPixels) {
      return { ok: false, status: 400, error: 'La imagen tiene demasiados píxeles para este tipo de archivo.' }
    }
    return { ok: true, mime: info.mime, width: info.width, height: info.height }
  }

  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 2048))).toLowerCase()
  if (!head.includes('<svg')) return { ok: false, status: 415, error: UNSUPPORTED }
  if (kind === 'print') return { ok: false, status: 415, error: 'El archivo de impresión debe ser PNG.' }
  if (kind === 'preview') return { ok: false, status: 415, error: 'La vista previa debe ser PNG, JPG o WebP.' }
  const svg = checkSvg(bytes)
  if (!svg.ok) {
    return {
      ok: false,
      status: 400,
      error: 'El SVG contiene elementos no permitidos (scripts, enlaces externos o eventos). Expórtalo como SVG simple o súbelo como PNG.',
    }
  }
  return { ok: true, mime: 'image/svg+xml', width: null, height: null }
}

export async function saveFile(input: {
  kind: FileKind
  name?: string | null
  mime: string
  bytes: Uint8Array
}): Promise<{ id: string }> {
  const db = await getDb()
  const id = newId(24)
  await db.execute({
    sql: `INSERT INTO files (id, kind, name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.kind, input.name?.slice(0, 160) ?? null, input.mime, input.bytes.byteLength, input.bytes, nowIso()],
  })
  return { id }
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return new Uint8Array(0)
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const db = await getDb()
  const res = await db.execute({ sql: `SELECT * FROM files WHERE id = ?`, args: [id] })
  const r = res.rows[0]
  if (!r) return null
  return {
    id: String(r.id),
    kind: String(r.kind) as FileKind,
    name: r.name == null ? null : String(r.name),
    mime: String(r.mime),
    size: Number(r.size),
    bytes: toBytes(r.data),
    orderId: r.order_id == null ? null : String(r.order_id),
    quoteId: r.quote_id == null ? null : String(r.quote_id),
    createdAt: String(r.created_at),
  }
}

export async function getFileMetas(ids: string[]): Promise<FileMeta[]> {
  if (ids.length === 0) return []
  const db = await getDb()
  const marks = ids.map(() => '?').join(',')
  const res = await db.execute({
    sql: `SELECT id, kind, name, mime, size, order_id, quote_id, created_at FROM files WHERE id IN (${marks})`,
    args: ids,
  })
  return res.rows.map((r) => ({
    id: String(r.id),
    kind: String(r.kind) as FileKind,
    name: r.name == null ? null : String(r.name),
    mime: String(r.mime),
    size: Number(r.size),
    orderId: r.order_id == null ? null : String(r.order_id),
    quoteId: r.quote_id == null ? null : String(r.quote_id),
    createdAt: String(r.created_at),
  }))
}

export interface PngSize {
  width: number
  height: number
  /** Resolución anotada en el PNG (chunk pHYs), si la lleva. */
  dpi: number | null
}

/**
 * Dimensiones (px) y resolución (ppp) de archivos PNG ya guardados, leídas del comienzo del archivo sin cargarlo
 * entero. Los ids que no existen o no son PNG no aparecen en el resultado.
 */
export async function getPngSizes(ids: string[]): Promise<Map<string, PngSize>> {
  const out = new Map<string, PngSize>()
  if (ids.length === 0) return out
  const db = await getDb()
  const marks = ids.map(() => '?').join(',')
  const res = await db.execute({
    sql: `SELECT id, substr(data, 1, 96) AS head FROM files WHERE mime = 'image/png' AND id IN (${marks})`,
    args: ids,
  })
  for (const r of res.rows) {
    const head = toBytes(r.head)
    const size = readPngHeader(head)
    if (size) out.set(String(r.id), { ...size, dpi: readPngDpi(head) })
  }
  return out
}

/** Bytes de archivos subidos que aún no pertenecen a ningún pedido ni presupuesto. */
export async function unattachedBytes(): Promise<number> {
  const db = await getDb()
  const res = await db.execute(`SELECT COALESCE(SUM(size), 0) AS total FROM files WHERE order_id IS NULL AND quote_id IS NULL`)
  return Number(res.rows[0]?.total ?? 0)
}

/** Asocia archivos a un pedido o presupuesto para que no se limpien como huérfanos. */
export async function attachFiles(target: { orderId?: string; quoteId?: string }, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  const marks = ids.map(() => '?').join(',')
  if (target.orderId)
    await db.execute({ sql: `UPDATE files SET order_id = ? WHERE id IN (${marks})`, args: [target.orderId, ...ids] })
  if (target.quoteId)
    await db.execute({ sql: `UPDATE files SET quote_id = ? WHERE id IN (${marks})`, args: [target.quoteId, ...ids] })
}

/** Borra archivos que nunca llegaron a un pedido/presupuesto (carritos abandonados). */
export async function purgeOrphanFiles(maxAgeHours = site.uploads.orphanRetentionDays * 24): Promise<number> {
  const db = await getDb()
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString()
  const res = await db.execute({
    sql: `DELETE FROM files WHERE order_id IS NULL AND quote_id IS NULL AND created_at < ?`,
    args: [cutoff],
  })
  return res.rowsAffected
}
