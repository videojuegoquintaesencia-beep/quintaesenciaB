'use client'
import { useEffect, useMemo, useState } from 'react'
import { mockupDataUrl } from '@/components/mockups'
import type { ProductId } from '@/config/products'
import { designArtworkFileIds, type Design } from '@/lib/design'
import { loadFileImage, type LoadedImage } from '@/lib/editor/images'

export type ImageState = LoadedImage | 'error'
export type ImageMap = Record<string, ImageState>

/** Carga (y mantiene en estado) las imágenes subidas que usa el diseño. */
export function useDesignImages(design: Design): ImageMap {
  const [loaded, setLoaded] = useState<ImageMap>({})
  const idsKey = useMemo(() => designArtworkFileIds(design).sort().join(','), [design])

  useEffect(() => {
    let cancelled = false
    const ids = idsKey ? idsKey.split(',') : []
    for (const id of ids) {
      if (loaded[id]) continue
      loadFileImage(id)
        .then((img) => !cancelled && setLoaded((prev) => ({ ...prev, [id]: img })))
        .catch(() => !cancelled && setLoaded((prev) => ({ ...prev, [id]: 'error' })))
    }
    return () => {
      cancelled = true
    }
    // `loaded` no es una dependencia a propósito: solo se piden las que faltan al cambiar la lista de ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return loaded
}

/** Imagen del mockup del producto para pintarla en el lienzo. */
export function useMockupImage(productId: ProductId, viewId: string, colorHex: string): HTMLImageElement | null {
  const src = useMemo(() => mockupDataUrl({ productId, viewId, colorHex, guides: false }), [productId, viewId, colorHex])
  const [state, setState] = useState<{ src: string; img: HTMLImageElement } | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => !cancelled && setState({ src, img })
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  // Mientras llega la nueva imagen se mantiene la anterior para evitar parpadeos.
  return state?.img ?? null
}
