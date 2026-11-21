'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalog } from '@/components/catalog/CatalogProvider'
import { parseDesign, type Design } from '@/lib/design'
import { getProduct } from '@/config/products'
import { useCart } from '@/lib/cart-store'
import { exportDesignFiles, type ExportCache, type ExportProgress } from '@/lib/editor/export'
import { useEditor } from '@/lib/editor/store'
import { priceLine } from '@/lib/pricing'

export type CartPhase = 'idle' | 'working' | 'error' | 'done'

export interface CartState {
  phase: CartPhase
  error?: string
  progress: ExportProgress
  lineId?: string
  /** true si se han guardado cambios de una línea existente. */
  edited?: boolean
  previewId?: string
}

/** Quita zonas vacías antes de guardar el diseño en el carrito. */
function pruneDesign(design: Design): Design {
  const areas: Design['areas'] = {}
  for (const [id, data] of Object.entries(design.areas)) if (data.layers.length > 0) areas[id] = data
  return { ...design, areas }
}

/** Genera previews y archivos de impresión, los sube y añade (o actualiza) la línea del carrito. */
export function useAddToCart() {
  const [state, setState] = useState<CartState>({ phase: 'idle', progress: { done: 0, total: 0 } })
  const cache = useRef<ExportCache>(new Map())
  const busy = useRef(false)
  // El precio se comprueba con el catálogo efectivo (el mismo que usa el servidor); por ref para no recrear `run`.
  const catalog = useCatalog()
  const catalogRef = useRef(catalog)
  useEffect(() => {
    catalogRef.current = catalog
  }, [catalog])

  const run = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setState({ phase: 'working', progress: { done: 0, total: 0 } })
    const s = useEditor.getState()
    try {
      const checked = parseDesign(pruneDesign(s.design))
      if (!checked.ok) throw new Error(checked.error)
      const priced = priceLine({ productId: s.productId, colorId: s.design.colorId, sizes: s.sizes, design: checked.design }, catalogRef.current)
      if (!priced.ok) throw new Error(priced.error)

      const { previews, printFiles } = await exportDesignFiles(checked.design, cache.current, (progress) =>
        setState((prev) => ({ ...prev, progress })),
      )
      if (Object.keys(printFiles).length === 0) throw new Error('No hay nada que imprimir dentro de las zonas de estampado.')

      const payload = {
        productId: s.productId,
        colorId: s.design.colorId,
        sizes: { ...s.sizes },
        design: checked.design,
        previews,
        printFiles,
      }
      const cart = useCart.getState()
      let lineId: string
      let edited = false
      if (s.editLineId && cart.lines.some((l) => l.id === s.editLineId)) {
        cart.updateLine(s.editLineId, payload)
        lineId = s.editLineId
        edited = true
      } else {
        lineId = cart.addLine(payload)
      }
      const view = getProduct(s.productId)?.views.find((v) => previews[v.id])
      setState((prev) => ({ ...prev, phase: 'done', lineId, edited, previewId: view ? previews[view.id] : undefined }))
      s.announce(edited ? 'Cambios guardados en el carrito.' : 'Añadido al carrito.')
    } catch (e) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: e instanceof Error ? e.message : 'No hemos podido preparar tu diseño. Inténtalo de nuevo.',
      }))
    } finally {
      busy.current = false
    }
  }, [])

  const close = useCallback(() => setState((prev) => ({ ...prev, phase: 'idle' })), [])
  return { state, run, close }
}
