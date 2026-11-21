'use client'
import { useMemo } from 'react'
import { getColor, type Product, type ProductColor } from '@/config/products'
import { useCatalog } from '@/components/catalog/CatalogProvider'
import type { CartLine } from '@/lib/cart-store'
import { priceLine, totalQuantity, type LinePrice } from '@/lib/pricing'
import { catalogProduct } from '@/lib/settings-schema'

export interface PricedLine {
  line: CartLine
  /** Producto con los precios efectivos (editables en el panel). */
  product: Product | undefined
  color: ProductColor | undefined
  /** null si la línea no se puede calcular (ver `error`). */
  price: LinePrice | null
  error: string | null
  units: number
}

/** Calcula el precio de cada línea con la misma función y el mismo catálogo efectivo que usa el servidor. */
export function usePricedLines(lines: CartLine[]): PricedLine[] {
  const catalog = useCatalog()
  return useMemo(
    () =>
      lines.map((line) => {
        const product = catalogProduct(catalog, line.productId)
        const color = product ? getColor(product, line.colorId) : undefined
        const result = priceLine({ productId: line.productId, colorId: line.colorId, sizes: line.sizes, design: line.design }, catalog)
        return {
          line,
          product,
          color,
          price: result.ok ? result : null,
          error: result.ok ? null : result.error,
          units: totalQuantity(line.sizes),
        }
      }),
    [lines, catalog],
  )
}
