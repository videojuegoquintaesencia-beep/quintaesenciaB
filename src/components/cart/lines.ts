'use client'
import { useMemo } from 'react'
import { getColor, getProduct, type Product, type ProductColor } from '@/config/products'
import type { CartLine } from '@/lib/cart-store'
import { priceLine, totalQuantity, type LinePrice } from '@/lib/pricing'

export interface PricedLine {
  line: CartLine
  product: Product | undefined
  color: ProductColor | undefined
  /** null si la línea no se puede calcular (ver `error`). */
  price: LinePrice | null
  error: string | null
  units: number
}

/** Calcula el precio de cada línea con la misma función que usa el servidor. */
export function usePricedLines(lines: CartLine[]): PricedLine[] {
  return useMemo(
    () =>
      lines.map((line) => {
        const product = getProduct(line.productId)
        const color = product ? getColor(product, line.colorId) : undefined
        const result = priceLine({ productId: line.productId, colorId: line.colorId, sizes: line.sizes, design: line.design })
        return {
          line,
          product,
          color,
          price: result.ok ? result : null,
          error: result.ok ? null : result.error,
          units: totalQuantity(line.sizes),
        }
      }),
    [lines],
  )
}
