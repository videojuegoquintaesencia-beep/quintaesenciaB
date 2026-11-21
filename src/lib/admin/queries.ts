/**
 * Lecturas con caché por petición: la página y `generateMetadata` comparten una sola consulta.
 * Cada lectura comprueba la sesión por sí misma (capa de acceso a datos): no depende solo de proxy.ts ni del
 * layout, que no se vuelve a ejecutar en las navegaciones entre páginas del panel.
 */
import 'server-only'
import { cache } from 'react'
import { requireAdmin } from '@/lib/auth'
import { getFileMetas } from '@/lib/files'
import { getOrderById, type Order } from '@/lib/orders'
import { getQuote } from '@/lib/quotes'
import type { QuoteSource } from './order-view'

export const loadOrder = cache(async (id: string) => {
  await requireAdmin()
  return getOrderById(id)
})
export const loadQuote = cache(async (id: string) => {
  await requireAdmin()
  return getQuote(id)
})

/** Presupuesto del que procede un pedido, con sus adjuntos (undefined si el pedido no viene de un presupuesto). */
export const loadOrderQuoteSource = cache(async (order: Pick<Order, 'quoteId'>): Promise<QuoteSource | undefined> => {
  if (!order.quoteId) return undefined
  const quote = await loadQuote(order.quoteId)
  if (!quote) return undefined
  return { id: quote.id, number: quote.number, files: await getFileMetas(quote.fileIds) }
})
