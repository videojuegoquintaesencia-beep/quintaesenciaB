/** Filtros de la lista de pedidos (URL → opciones de `listOrders`). Lo comparten la página y la exportación CSV. */
import { isOrderStatus, type OrderStatus } from '@/lib/order-status'
import { one, positiveInt, type SearchParams } from './params'

export type OrdersStatusFilter = OrderStatus | 'open' | 'active' | 'all'

export interface OrdersFilters {
  status: OrdersStatusFilter
  q: string
  includeUnpaid: boolean
  page: number
}

export const ORDERS_PAGE_SIZE = 25

export function parseOrdersFilters(params: SearchParams): OrdersFilters {
  const estado = one(params.estado)
  const status: OrdersStatusFilter =
    estado === 'all' || estado === 'active' ? estado : isOrderStatus(estado) ? estado : 'open'
  return {
    status,
    q: (one(params.q) ?? '').trim().slice(0, 100),
    includeUnpaid: one(params.pendientes) === '1',
    page: positiveInt(params.pagina),
  }
}
