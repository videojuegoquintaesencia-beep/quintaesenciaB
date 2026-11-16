import Link from 'next/link'
import { formatEUR, unidades } from '@/lib/format'
import type { OrderSummary } from '@/lib/orders'
import { adminDateTime, adminShortDateTime } from '@/lib/admin/dates'
import { OrderStatusBadge } from './StatusBadges'

/**
 * Lista de pedidos: tabla cuando el contenedor es ancho y tarjetas cuando no (mismo contenido, sin desplazamiento horizontal).
 * Todo el contenido útil está en enlaces al detalle del pedido.
 */
export function OrdersTable({ orders, caption }: { orders: OrderSummary[]; caption: string }) {
  return (
    <div className="@container">
      <div className="hidden overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-pop-sm @3xl:block">
        <table className="w-full border-collapse text-left text-[0.95rem]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-violet-soft text-sm">
            <tr>
              <th scope="col" className="px-4 py-3 font-extrabold">Pedido</th>
              <th scope="col" className="px-3 py-3 font-extrabold">Fecha</th>
              <th scope="col" className="px-3 py-3 font-extrabold">Cliente</th>
              <th scope="col" className="px-3 py-3 text-right font-extrabold">Uds.</th>
              <th scope="col" className="px-3 py-3 text-right font-extrabold">Total</th>
              <th scope="col" className="px-4 py-3 font-extrabold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t-2 border-ink/15 hover:bg-yellow-soft/50">
                <td className="whitespace-nowrap px-4 py-3 font-display text-lg font-semibold">
                  <Link href={`/admin/pedidos/${o.id}`} className="text-ink underline decoration-pink decoration-2 underline-offset-4 hover:bg-yellow">
                    {o.number}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{adminDateTime(o.createdAt)}</td>
                <td className="max-w-[18rem] px-3 py-3">
                  <span className="block truncate font-bold">{o.customerName}</span>
                  <span className="block truncate text-sm text-ink-soft">{o.company || o.email}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{o.units}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums">{formatEUR(o.totalCents)}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="space-y-3 @3xl:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/pedidos/${o.id}`}
              className="block rounded-2xl border-2 border-ink bg-paper p-4 text-ink no-underline shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-xl font-semibold underline decoration-pink decoration-2 underline-offset-4">{o.number}</span>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="mt-1.5 truncate font-bold">{o.customerName}</p>
              {o.company && <p className="truncate text-sm text-ink-soft">{o.company}</p>}
              <p className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-sm text-ink-soft">
                <span>
                  {adminShortDateTime(o.createdAt)} · {unidades(o.units)}
                </span>
                <span className="font-bold text-ink">{formatEUR(o.totalCents)}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
