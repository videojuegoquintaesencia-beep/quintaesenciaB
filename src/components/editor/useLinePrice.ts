'use client'
import { useDeferredValue, useMemo } from 'react'
import { priceLine, type LinePrice, type PriceError } from '@/lib/pricing'
import { useEditor } from '@/lib/editor/store'

/** Precio de la línea actual, recalculado con el mismo código que usa el servidor. */
export function useLinePrice(): LinePrice | PriceError {
  const productId = useEditor((s) => s.productId)
  const design = useEditor((s) => s.design)
  const sizes = useEditor((s) => s.sizes)
  // Durante un arrastre el precio se actualiza con la prioridad más baja para no frenar el lienzo.
  const deferred = useDeferredValue(design)
  return useMemo(
    () => priceLine({ productId, colorId: deferred.colorId, sizes, design: deferred }),
    [productId, sizes, deferred],
  )
}
