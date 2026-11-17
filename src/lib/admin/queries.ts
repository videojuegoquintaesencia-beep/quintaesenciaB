/**
 * Lecturas con caché por petición: la página y `generateMetadata` comparten una sola consulta.
 * Cada lectura comprueba la sesión por sí misma (capa de acceso a datos): no depende solo de proxy.ts ni del
 * layout, que no se vuelve a ejecutar en las navegaciones entre páginas del panel.
 */
import 'server-only'
import { cache } from 'react'
import { requireAdmin } from '@/lib/auth'
import { getOrderById } from '@/lib/orders'
import { getQuote } from '@/lib/quotes'

export const loadOrder = cache(async (id: string) => {
  await requireAdmin()
  return getOrderById(id)
})
export const loadQuote = cache(async (id: string) => {
  await requireAdmin()
  return getQuote(id)
})
