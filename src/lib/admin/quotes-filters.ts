/** Filtros de la lista de presupuestos y mensajes (URL → opciones de `listQuotes`). */
import { statusesForKind, type QuoteStatus } from '@/lib/order-status'
import type { QuoteKind } from '@/lib/quotes'
import { one, positiveInt, type SearchParams } from './params'

export type QuotesStatusFilter = QuoteStatus | 'active' | 'all'

export interface QuotesFilters {
  kind: QuoteKind
  /** Valor del parámetro `tipo` en la URL. */
  tab: 'presupuestos' | 'mensajes'
  status: QuotesStatusFilter
  q: string
  page: number
}

export const QUOTES_PAGE_SIZE = 25

export function parseQuotesFilters(params: SearchParams): QuotesFilters {
  const tab = one(params.tipo) === 'mensajes' ? 'mensajes' : 'presupuestos'
  const estado = one(params.estado)
  const kind: QuoteKind = tab === 'mensajes' ? 'contact' : 'quote'
  // Los mensajes no usan los estados de presupuesto (enviado, ganado, perdido): si llegan en la URL, se ignoran.
  const valid = statusesForKind(kind) as readonly string[]
  const status: QuotesStatusFilter =
    estado === 'all' ? 'all' : valid.includes(estado ?? '') ? (estado as QuoteStatus) : 'active'
  return {
    tab,
    kind,
    status,
    q: (one(params.q) ?? '').trim().slice(0, 100),
    page: positiveInt(params.pagina),
  }
}
