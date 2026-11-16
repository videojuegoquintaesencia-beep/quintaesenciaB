import { History } from 'lucide-react'
import type { OrderActor, OrderEvent } from '@/lib/orders'
import { adminDateTime } from '@/lib/admin/dates'
import { Panel } from './Panel'
import { OrderStatusBadge } from './StatusBadges'

const ACTOR_LABEL: Record<OrderActor, string> = {
  system: 'Sistema',
  customer: 'Cliente',
  admin: 'Panel',
  paypal: 'PayPal',
}

/** Historial del pedido, del más reciente al más antiguo. */
export function OrderEvents({ events }: { events: OrderEvent[] }) {
  const ordered = [...events].reverse()
  return (
    <Panel title="Historial" id="historial" icon={<History size={20} />}>
      {ordered.length === 0 ? (
        <p className="text-ink-soft">Todavía no hay movimientos.</p>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-ink/20 pl-5">
          {ordered.map((e) => (
            <li key={e.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.78rem] top-1.5 size-3.5 rounded-full border-2 border-ink bg-yellow"
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {e.status ? (
                  <OrderStatusBadge status={e.status} />
                ) : (
                  <span className="text-sm font-extrabold">Nota</span>
                )}
                <time dateTime={e.createdAt} className="text-sm text-ink-soft">
                  {adminDateTime(e.createdAt)} · {ACTOR_LABEL[e.actor] ?? e.actor}
                </time>
              </div>
              {e.note && <p className="mt-1 whitespace-pre-wrap break-words">{e.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
