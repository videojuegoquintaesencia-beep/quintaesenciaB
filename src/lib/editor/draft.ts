/** Borrador del diseño en localStorage (uno por producto). */
import { getProduct, type ProductId } from '@/config/products'
import { parseDesign, type Design } from '@/lib/design'
import { DRAFT_PREFIX } from './constants'

export interface Draft {
  design: Design
  sizes: Record<string, number>
}

const key = (productId: ProductId) => `${DRAFT_PREFIX}${productId}`

/** Cantidades válidas del borrador, recortadas al tope por diseño (el del catálogo efectivo si se indica). */
export function cleanSizes(productId: ProductId, raw: unknown, maxQtyPerLine?: number): Record<string, number> | null {
  const product = getProduct(productId)
  if (!product || !raw || typeof raw !== 'object') return null
  const max = maxQtyPerLine ?? product.maxQtyPerLine
  const out: Record<string, number> = {}
  for (const size of product.sizes) {
    const q = (raw as Record<string, unknown>)[size.id]
    if (typeof q === 'number' && Number.isInteger(q) && q > 0) out[size.id] = Math.min(q, max)
  }
  return out
}

export function loadDraft(productId: ProductId, maxQtyPerLine?: number): Draft | null {
  try {
    const raw = localStorage.getItem(key(productId))
    if (!raw) return null
    const data = JSON.parse(raw) as { design?: unknown; sizes?: unknown }
    const checked = parseDesign(data.design)
    if (!checked.ok || checked.design.productId !== productId) return null
    return { design: checked.design, sizes: cleanSizes(productId, data.sizes, maxQtyPerLine) ?? {} }
  } catch {
    return null
  }
}

export function saveDraft(productId: ProductId, draft: Draft): void {
  try {
    localStorage.setItem(key(productId), JSON.stringify({ v: 1, savedAt: Date.now(), ...draft }))
  } catch {
    // Almacenamiento lleno o bloqueado: el diseño sigue en memoria.
  }
}

export function clearDraft(productId: ProductId): void {
  try {
    localStorage.removeItem(key(productId))
  } catch {
    // nada que hacer
  }
}
