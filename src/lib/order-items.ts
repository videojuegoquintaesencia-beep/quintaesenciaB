/**
 * Ayudas puras para mostrar líneas de pedido, sean del personalizador o de un presupuesto aceptado.
 * Valen en el navegador y en el servidor (solo importan tipos).
 */
import type { OrderItem } from './orders'

/** Línea creada al aceptar una propuesta de presupuesto (sin diseño, previews ni archivos de impresión). */
export function isQuoteItem(item: Pick<OrderItem, 'kind'>): boolean {
  return item.kind === 'quote'
}

/** Título legible de una línea: la descripción de la dueña en presupuestos, "Producto · Color" en diseños. */
export function orderItemTitle(item: Pick<OrderItem, 'kind' | 'description' | 'productName' | 'colorName'>): string {
  if (item.kind === 'quote') return item.description?.trim() || item.productName
  return item.colorName ? `${item.productName} · ${item.colorName}` : item.productName
}

/** "Según presupuesto PR-1001" (o solo "Según presupuesto" si el número no está disponible). */
export function quoteLineNote(quoteNumber: string | null | undefined): string {
  return quoteNumber ? `Según presupuesto ${quoteNumber}` : 'Según presupuesto'
}
