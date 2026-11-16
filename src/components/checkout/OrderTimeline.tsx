import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/order-status'
import type { Order } from '@/lib/orders'

const STEPS: OrderStatus[] = ['paid', 'in_production', 'ready', 'shipped', 'delivered']

/** Línea de tiempo del pedido a partir de su historial de estados. */
export function OrderTimeline({ order }: { order: Order }) {
  const stepEvents = new Map<OrderStatus, Order['events'][number]>()
  for (const e of order.events) if (e.status && !stepEvents.has(e.status)) stepEvents.set(e.status, e)

  // Pedidos cancelados o reembolsados: se cuenta lo que pasó, en orden.
  if (order.status === 'cancelled' || order.status === 'refunded') {
    const shown = order.events.filter((e) => e.status && e.status !== 'pending_payment')
    return (
      <ol className="space-y-4">
        {shown.map((e) => (
          <li key={e.id} className="flex gap-3">
            <Marker state={e.status === order.status ? 'current' : 'done'} />
            <div>
              <p className="font-bold">{ORDER_STATUS_LABEL[e.status as OrderStatus]}</p>
              <p className="text-sm text-ink-soft">{formatDateTime(e.createdAt)}</p>
              {e.note && <p className="mt-1 text-sm">{e.note}</p>}
            </div>
          </li>
        ))}
        <li className="rounded-2xl border-2 border-ink bg-cream p-3 text-sm font-bold">
          {ORDER_STATUS_CUSTOMER_TEXT[order.status]}
        </li>
      </ol>
    )
  }

  const currentIndex = STEPS.indexOf(order.status)
  return (
    <ol>
      {STEPS.map((step, i) => {
        const event = stepEvents.get(step)
        const state = currentIndex < 0 ? 'todo' : i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo'
        return (
          <li key={step} className="flex gap-3" aria-current={state === 'current' ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <Marker state={state} />
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className={cn('my-1 w-0.5 flex-1', i < currentIndex ? 'bg-ink' : 'bg-ink/20')} />
              )}
            </div>
            <div className={cn('pb-6', i === STEPS.length - 1 && 'pb-0')}>
              <p className={cn('font-bold', state === 'todo' && 'text-ink-soft')}>
                {ORDER_STATUS_LABEL[step]}
                {state === 'current' && <span className="sr-only"> (estado actual)</span>}
              </p>
              {event && <p className="text-sm text-ink-soft">{formatDateTime(event.createdAt)}</p>}
              {state === 'current' && <p className="mt-1 text-sm">{ORDER_STATUS_CUSTOMER_TEXT[step]}</p>}
              {event?.note && state !== 'todo' && step !== 'paid' && <p className="mt-1 text-sm text-ink-soft">{event.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Marker({ state }: { state: 'done' | 'current' | 'todo' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink',
        state === 'done' && 'bg-teal',
        state === 'current' && 'bg-yellow shadow-pop-sm',
        state === 'todo' && 'bg-paper',
      )}
    >
      {state === 'done' && <Check size={16} strokeWidth={3} />}
    </span>
  )
}
