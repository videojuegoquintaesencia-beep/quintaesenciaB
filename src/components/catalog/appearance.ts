import type { Product, ProductId } from '@/config/products'
import { formatNumber } from '@/lib/format'

/** Fondo de color de cada producto (tarjetas, galería). Siempre claro para que el texto de tinta contraste. */
export const PRODUCT_TINT: Record<ProductId, string> = {
  camiseta: 'bg-pink-soft',
  hoodie: 'bg-violet-soft',
  gorra: 'bg-yellow-soft',
  taza: 'bg-teal-soft',
}

/** Diseño de ejemplo (índice de `ProductShowcase`) con el que se ilustra cada producto. */
export const PRODUCT_ART: Record<ProductId, number> = {
  camiseta: 0,
  hoodie: 1,
  gorra: 3,
  taza: 4,
}

export const CATEGORY_LABELS: Record<Product['category'], string> = {
  ropa: 'Ropa',
  accesorios: 'Accesorios',
  hogar: 'Hogar',
}

/** Título SEO a partir del slug: "camisetas-personalizadas" → "Camisetas personalizadas". */
export function seoTitle(product: Product): string {
  const text = product.slug.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Recorta un texto a `max` caracteres sin partir palabras. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[.,;:]$/, '')}…`
}

/** 30, 40 → "30 × 40 cm" */
export function sizeLabel(widthCm: number, heightCm: number): string {
  return `${formatNumber(widthCm)} × ${formatNumber(heightCm)} cm`
}
