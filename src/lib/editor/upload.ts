import { site } from '@/config/site'

export type UploadKind = 'artwork' | 'preview' | 'print'

export interface UploadedFile {
  id: string
  url: string
  mime: string
  size: number
}

const ACCEPTED = site.uploads.acceptedArtworkTypes as readonly string[]
export const ARTWORK_ACCEPT = [...ACCEPTED, '.png', '.jpg', '.jpeg', '.webp', '.svg'].join(',')

/** Validación previa en el navegador, con mensajes en castellano. Devuelve null si el archivo es válido. */
export function validateArtwork(file: File): string | null {
  const byExt = /\.(png|jpe?g|webp|svg)$/i.test(file.name)
  if (!ACCEPTED.includes(file.type) && !(file.type === '' && byExt)) {
    return `«${file.name}» no es un formato admitido. Sube una imagen PNG, JPG, WebP o SVG.`
  }
  if (file.size === 0) return `«${file.name}» está vacío.`
  if (file.size > site.uploads.maxArtworkBytes) {
    const mb = Math.round(site.uploads.maxArtworkBytes / 1024 / 1024)
    return `«${file.name}» pesa demasiado (máximo ${mb} MB). Prueba a exportarla con menos peso.`
  }
  return null
}

/** Sube un archivo a /api/uploads con progreso (XMLHttpRequest, porque fetch no informa de la subida). */
export function uploadFile(
  file: Blob,
  kind: UploadKind,
  opts: { name?: string; onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('kind', kind)
    form.append('file', file, opts.name ?? (file instanceof File ? file.name : `${kind}.png`))
    xhr.open('POST', '/api/uploads')
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      const body = xhr.response as (Partial<UploadedFile> & { error?: string }) | null
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) {
        resolve(body as UploadedFile)
      } else if (xhr.status === 429) {
        reject(new Error(body?.error ?? 'Demasiadas subidas seguidas. Espera un momento e inténtalo de nuevo.'))
      } else {
        reject(new Error(body?.error ?? 'No se pudo subir el archivo. Inténtalo de nuevo.'))
      }
    }
    xhr.onerror = () => reject(new Error('Sin conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.'))
    xhr.ontimeout = () => reject(new Error('La subida ha tardado demasiado. Inténtalo de nuevo.'))
    xhr.onabort = () => reject(new Error('Subida cancelada.'))
    opts.signal?.addEventListener('abort', () => xhr.abort())
    xhr.timeout = 120_000
    xhr.send(form)
  })
}
