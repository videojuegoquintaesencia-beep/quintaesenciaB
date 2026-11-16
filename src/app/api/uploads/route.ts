import { site } from '@/config/site'
import { FILE_KINDS, purgeOrphanFiles, saveFile, sniffImageMime, svgLooksUnsafe, type FileKind } from '@/lib/files'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * POST multipart/form-data  { file: File, kind: "artwork" | "preview" | "print" | "quote" }
 * → 200 { id, url, mime, size, name }
 *
 *  - artwork / quote: arte o logotipo del cliente (PNG, JPG, WebP o SVG), hasta site.uploads.maxArtworkBytes
 *  - preview: render del producto con el diseño (PNG/JPG/WebP generado por el editor)
 *  - print: PNG transparente listo para imprimir (generado por el editor)
 */
export async function POST(req: Request) {
  const limit = rateLimit(`upload:${clientIp(req)}`, 150, 10 * 60_000)
  if (!limit.ok) {
    return Response.json(
      { error: 'Demasiadas subidas seguidas. Espera un momento e inténtalo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > site.uploads.maxArtworkBytes + 1024 * 1024) {
    return Response.json({ error: 'El archivo es demasiado grande.' }, { status: 413 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'Petición no válida.' }, { status: 400 })
  }

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
  const mime = sniffImageMime(bytes)
  if (!mime) {
    return Response.json({ error: 'Formato no admitido. Sube una imagen PNG, JPG, WebP o SVG.' }, { status: 415 })
  }
  if (kind === 'print' && mime !== 'image/png') {
    return Response.json({ error: 'El archivo de impresión debe ser PNG.' }, { status: 415 })
  }
  if (kind === 'preview' && mime === 'image/svg+xml') {
    return Response.json({ error: 'La vista previa debe ser PNG, JPG o WebP.' }, { status: 415 })
  }
  if (mime === 'image/svg+xml' && svgLooksUnsafe(bytes)) {
    return Response.json({ error: 'El SVG contiene elementos no permitidos (scripts o eventos).' }, { status: 400 })
  }

  const { id } = await saveFile({ kind, name: file.name || null, mime, bytes })

  // Limpieza ocasional de subidas abandonadas (carritos que nunca se convirtieron en pedido).
  if (Math.random() < 0.01) void purgeOrphanFiles().catch(() => {})

  return Response.json({ id, url: `/api/files/${id}`, mime, size: bytes.byteLength, name: file.name || null })
}
