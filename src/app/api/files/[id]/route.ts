import { getFile } from '@/lib/files'
import { isValidId } from '@/lib/ids'

export const runtime = 'nodejs'

/**
 * Sirve un archivo subido. Los ids son aleatorios y no adivinables (≈ 120 bits).
 * `?download=1` fuerza la descarga. Los SVG se sirven con CSP "sandbox" para que no ejecuten nada.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!isValidId(id)) return new Response('No encontrado', { status: 404 })
  const file = await getFile(id)
  if (!file) return new Response('No encontrado', { status: 404 })

  const headers = new Headers({
    'Content-Type': file.mime,
    'Content-Length': String(file.size),
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  if (new URL(req.url).searchParams.get('download') === '1') {
    const ext = file.mime === 'image/svg+xml' ? 'svg' : file.mime.split('/')[1] || 'bin'
    const base = (file.name ?? `archivo-${file.id}`).replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w.\- ]+/g, '_').slice(0, 80)
    headers.set('Content-Disposition', `attachment; filename="${base}.${ext}"`)
  }
  return new Response(new Uint8Array(file.bytes), { headers })
}
