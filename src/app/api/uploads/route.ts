import { after } from 'next/server'
import { site } from '@/config/site'
import { FILE_KINDS, inspectUpload, saveFile, unattachedBytes, type FileKind } from '@/lib/files'
import { readBodyForm } from '@/lib/http-body'
import { runMaintenanceIfDue } from '@/lib/maintenance'
import { byteBudget, clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** Peticiones de subida que se procesan a la vez (cada una puede ocupar hasta ~13 MB en memoria). */
const MAX_IN_FLIGHT = 12
/** Por IP y 10 minutos: nº de subidas y bytes totales. */
const UPLOADS_PER_WINDOW = 80
const BYTES_PER_WINDOW = 200 * 1024 * 1024
const WINDOW_MS = 10 * 60_000

type G = typeof globalThis & { __puUploadsInFlight?: number }
const g = globalThis as G

const tooMany = (error: string, retryAfterSec: number) =>
  Response.json({ error }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })

/**
 * POST multipart/form-data  { file: File, kind: "artwork" | "preview" | "print" | "quote" }
 * → 200 { id, url, mime, size, name }
 *
 *  - artwork / quote: arte o logotipo del cliente (PNG, JPG, WebP o SVG), hasta site.uploads.maxArtworkBytes
 *  - preview: render del producto con el diseño (PNG/JPG/WebP generado por el editor)
 *  - print: PNG transparente listo para imprimir (generado por el editor)
 *
 * El cuerpo se lee con un tope real de bytes (aunque no haya Content-Length) y el archivo se valida por su
 * estructura (ver lib/files.ts: inspectUpload), no solo por la cabecera.
 */
export async function POST(req: Request) {
  const ip = clientIp(req)
  const limit = rateLimit(`upload:${ip}`, UPLOADS_PER_WINDOW, WINDOW_MS)
  if (!limit.ok) return tooMany('Demasiadas subidas seguidas. Espera un momento e inténtalo de nuevo.', limit.retryAfterSec)

  if ((g.__puUploadsInFlight ?? 0) >= MAX_IN_FLIGHT) {
    return Response.json(
      { error: 'Estamos recibiendo muchas subidas a la vez. Inténtalo de nuevo en unos segundos.' },
      { status: 503, headers: { 'Retry-After': '5' } },
    )
  }
  g.__puUploadsInFlight = (g.__puUploadsInFlight ?? 0) + 1
  try {
    return await handleUpload(req, ip)
  } finally {
    g.__puUploadsInFlight = Math.max(0, (g.__puUploadsInFlight ?? 1) - 1)
  }
}

async function handleUpload(req: Request, ip: string): Promise<Response> {
  // Archivo máximo + margen para los campos y delimitadores del multipart.
  const read = await readBodyForm(req, site.uploads.maxArtworkBytes + 1024 * 1024)
  if (!read.ok) {
    return read.status === 413
      ? Response.json({ error: 'El archivo es demasiado grande.' }, { status: 413 })
      : Response.json({ error: 'Petición no válida.' }, { status: 400 })
  }
  const form = read.value

  const kind = String(form.get('kind') ?? '') as FileKind
  if (!FILE_KINDS.includes(kind)) return Response.json({ error: 'Tipo de archivo no válido.' }, { status: 400 })
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: 'Falta el archivo.' }, { status: 400 })

  const maxBytes = kind === 'artwork' || kind === 'quote' ? site.uploads.maxArtworkBytes : site.uploads.maxGeneratedBytes
  if (file.size > maxBytes) {
    return Response.json(
      { error: `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.` },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const inspected = inspectUpload(kind, bytes)
  if (!inspected.ok) return Response.json({ error: inspected.error }, { status: inspected.status })

  // Presupuesto de bytes por IP y tope global de archivos pendientes (protegen la base de datos).
  const budget = byteBudget(`upload-bytes:${ip}`, bytes.byteLength, BYTES_PER_WINDOW, WINDOW_MS)
  if (!budget.ok) return tooMany('Has subido muchos archivos pesados seguidos. Espera unos minutos e inténtalo de nuevo.', budget.retryAfterSec)
  if ((await unattachedBytes()) + bytes.byteLength > site.uploads.maxPendingBytes) {
    after(() => runMaintenanceIfDue())
    return Response.json(
      { error: 'Ahora mismo no podemos recibir más archivos. Inténtalo de nuevo en unas horas o escríbenos y lo resolvemos.' },
      { status: 503, headers: { 'Retry-After': '3600' } },
    )
  }

  const { id } = await saveFile({ kind, name: file.name || null, mime: inspected.mime, bytes })

  // Limpieza periódica (como mucho una vez por hora): archivos huérfanos y pedidos que nunca se pagaron.
  after(() => runMaintenanceIfDue())

  return Response.json({ id, url: `/api/files/${id}`, mime: inspected.mime, size: bytes.byteLength, name: file.name || null })
}
