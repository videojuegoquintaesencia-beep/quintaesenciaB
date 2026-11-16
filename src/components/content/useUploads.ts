'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { site } from '@/config/site'
import { newId } from '@/lib/ids'

export const MAX_UPLOADS = 5

export interface UploadItem {
  key: string
  name: string
  size: number
  /** URL local (blob:) para la miniatura; vacía si el archivo se rechazó antes de subirlo. */
  previewUrl: string
  status: 'uploading' | 'done' | 'error'
  fileId?: string
  error?: string
}

const ACCEPTED = site.uploads.acceptedArtworkTypes as readonly string[]
const maxMb = Math.round(site.uploads.maxArtworkBytes / 1024 / 1024)

function rejection(file: File): string | null {
  const isSvgByName = file.type === '' && /\.svg$/i.test(file.name)
  if (!ACCEPTED.includes(file.type) && !isSvgByName) return 'Formato no admitido. Sube PNG, JPG, WebP o SVG.'
  if (file.size > site.uploads.maxArtworkBytes) return `Pesa más de ${maxMb} MB.`
  if (file.size === 0) return 'El archivo está vacío.'
  return null
}

/** Subida de logotipos/diseños a /api/uploads (kind "quote") con miniaturas locales. */
export function useUploads() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const urls = useRef(new Set<string>())

  useEffect(() => {
    const live = urls.current
    return () => live.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const patch = useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)))
  }, [])

  const upload = useCallback(
    async (key: string, file: File) => {
      const body = new FormData()
      body.set('file', file)
      body.set('kind', 'quote')
      let message = 'No se pudo subir el archivo. Quítalo e inténtalo de nuevo.'
      try {
        const res = await fetch('/api/uploads', { method: 'POST', body })
        const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
        if (res.ok && data?.id) {
          patch(key, { status: 'done', fileId: data.id })
          return
        }
        if (data?.error) message = data.error
      } catch {
        message = 'Sin conexión. Quita el archivo e inténtalo de nuevo.'
      }
      patch(key, { status: 'error', error: message })
    },
    [patch],
  )

  const add = (files: File[]) => {
    setNotice(null)
    const room = Math.max(MAX_UPLOADS - items.length, 0)
    const accepted = files.slice(0, room)
    if (files.length > accepted.length) setNotice(`Puedes adjuntar hasta ${MAX_UPLOADS} archivos. Quita alguno para añadir más.`)

    const created = accepted.map((file) => {
      const problem = rejection(file)
      const item: UploadItem = {
        key: newId(10),
        name: file.name || 'archivo',
        size: file.size,
        previewUrl: '',
        status: problem ? 'error' : 'uploading',
        error: problem ?? undefined,
      }
      if (!problem) {
        item.previewUrl = URL.createObjectURL(file)
        urls.current.add(item.previewUrl)
        void upload(item.key, file)
      }
      return item
    })
    if (created.length) setItems((prev) => [...prev, ...created])
  }

  const remove = (key: string) => {
    setNotice(null)
    setItems((prev) => {
      const gone = prev.find((it) => it.key === key)
      if (gone?.previewUrl) {
        URL.revokeObjectURL(gone.previewUrl)
        urls.current.delete(gone.previewUrl)
      }
      return prev.filter((it) => it.key !== key)
    })
  }

  const clear = useCallback(() => {
    urls.current.forEach((u) => URL.revokeObjectURL(u))
    urls.current.clear()
    setItems([])
    setNotice(null)
  }, [])

  return {
    items,
    notice,
    add,
    remove,
    clear,
    /** Ids de los archivos ya subidos correctamente. */
    ids: items.flatMap((it) => (it.status === 'done' && it.fileId ? [it.fileId] : [])),
    uploading: items.some((it) => it.status === 'uploading'),
    hasError: items.some((it) => it.status === 'error'),
    full: items.length >= MAX_UPLOADS,
  }
}

export type Uploads = ReturnType<typeof useUploads>
