import { getProduct } from '@/config/products'
import type { CartLine } from '@/lib/cart-store'
import type { PricedLine } from './lines'

/** Primera vista del producto que tenga previsualización (si no, cualquiera). */
export function primaryPreviewId(line: Pick<CartLine, 'productId' | 'previews'>): string | null {
  const product = getProduct(line.productId)
  const byView = product?.views.map((v) => line.previews[v.id]).find(Boolean)
  return byView ?? Object.values(line.previews)[0] ?? null
}

export function editHref(line: Pick<CartLine, 'id' | 'productId' | 'colorId'>): string {
  return `/personalizar/${line.productId}?color=${encodeURIComponent(line.colorId)}&linea=${line.id}`
}

export function lineTitle(p: Pick<PricedLine, 'product' | 'color' | 'line'>): string {
  return `${p.product?.name ?? p.line.productId} · ${p.color?.name ?? p.line.colorId}`
}
