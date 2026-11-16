/**
 * Archivos subidos (artes del cliente, previsualizaciones y archivos de impresión).
 * Se guardan en la base de datos como BLOB y se sirven por /api/files/[id].
 */
import 'server-only'
import { site } from '@/config/site'
import { getDb, nowIso } from './db'
import { newId } from './ids'

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

/** Detecta el tipo real por los primeros bytes (no nos fiamos del nombre ni del Content-Type del cliente). */
export function sniffImageMime(bytes: Uint8Array): (typeof site.uploads.acceptedArtworkTypes)[number] | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return 'image/webp'
  const head = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 2048))).toLowerCase()
  if (head.includes('<svg')) return 'image/svg+xml'
  return null
}

/** Rechazo básico de SVG con contenido activo (además se sirven siempre con CSP "sandbox"). */
export function svgLooksUnsafe(bytes: Uint8Array): boolean {
  const text = new TextDecoder().decode(bytes).toLowerCase()
  return (
    text.includes('<script') ||
    text.includes('javascript:') ||
    text.includes('<foreignobject') ||
    /\son[a-z]+\s*=/.test(text) ||
    text.includes('<!entity')
  )
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
export async function purgeOrphanFiles(maxAgeHours = 24 * 14): Promise<number> {
  const db = await getDb()
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString()
  const res = await db.execute({
    sql: `DELETE FROM files WHERE order_id IS NULL AND quote_id IS NULL AND created_at < ?`,
    args: [cutoff],
  })
  return res.rowsAffected
}
