import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Banknote, CircleCheck, Inbox, Package, ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/components/admin/EmptyState'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { PageHeader } from '@/components/admin/PageHeader'
import { QuotesList } from '@/components/admin/QuotesList'
import { StatCard } from '@/components/admin/StatCard'
import { formatEUR } from '@/lib/format'
import { requireAdmin } from '@/lib/auth'
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/order-status'
import { getOrderStats, listOrders } from '@/lib/orders'
import { countNewQuotes, listQuotes } from '@/lib/quotes'
import { todayLabel } from '@/lib/admin/dates'

export const metadata: Metadata = { title: 'Resumen' }

/** Estados que piden algo al dueño, en el orden del flujo de trabajo. */
const ACTION_GROUPS: { status: OrderStatus; title: string; hint: string }[] = [
  { status: 'paid', title: 'Nuevos: pagados y sin empezar', hint: 'Revisa el diseño y pásalos a producción.' },
  { status: 'in_production', title: 'En producción', hint: 'Cuando estén terminados, márcalos como listos.' },
  { status: 'ready', title: 'Listos para enviar', hint: 'Falta entregarlos a la mensajería.' },
]
const GROUP_LIMIT = 8

export default async function AdminDashboardPage() {
  await requireAdmin()
  const [stats, newQuotes, quotes, ...groups] = await Promise.all([
    getOrderStats(),
    countNewQuotes(),
    listQuotes({ status: 'active', limit: 5 }),
    ...ACTION_GROUPS.map((g) => listOrders({ status: g.status, limit: GROUP_LIMIT })),
  ])
  const nothingToDo = groups.every((g) => g.total === 0)

  return (
    <>
      <PageHeader title="Resumen" description={todayLabel()} />

      <section aria-label="Cifras clave" className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Por procesar"
          value={stats.toProcess}
          hint="Pagados, en producción o listos para enviar"
          tone="yellow"
          href="/admin/pedidos?estado=active"
          icon={<Package size={22} />}
        />
        <StatCard
          label="Pedidos · 30 días"
          value={stats.orders30d}
          hint="Pedidos pagados en el último mes"
          tone="teal"
          icon={<ShoppingBag size={22} />}
        />
        <StatCard
          label="Ingresos · 30 días"
          value={formatEUR(stats.revenue30dCents, { compact: true })}
          hint="IVA incluido, sin contar cancelados ni reembolsos"
          tone="violet"
          icon={<Banknote size={22} />}
        />
        <StatCard
          label="Presupuestos nuevos"
          value={newQuotes}
          hint={newQuotes === 0 ? 'Todo respondido' : 'Esperan tu respuesta'}
          tone="pink"
          href="/admin/presupuestos?estado=new"
          icon={<Inbox size={22} />}
        />
      </section>

      <div className="grid items-start gap-8 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="accion-title" className="min-w-0 space-y-7">
          <h2 id="accion-title" className="text-2xl">Pedidos que requieren acción</h2>
          {nothingToDo ? (
            <EmptyState icon={<CircleCheck size={24} />} title="No hay pedidos pendientes">
              Cuando entre un pedido pagado aparecerá aquí para que lo prepares.
            </EmptyState>
          ) : (
            ACTION_GROUPS.map((group, i) => {
              const { rows, total } = groups[i]
              if (total === 0) return null
              return (
                <section key={group.status} aria-labelledby={`grupo-${group.status}`}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
                    <h3 id={`grupo-${group.status}`} className="text-xl">
                      {group.title} <span className="font-body text-base text-ink-soft">({total})</span>
                    </h3>
                    {total > rows.length && (
                      <Link
                        href={`/admin/pedidos?estado=${group.status}`}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-violet-deep"
                      >
                        Ver los {total} <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                  <p className="mb-3 text-sm text-ink-soft">{group.hint}</p>
                  <OrdersTable orders={rows} caption={`${ORDER_STATUS_LABEL[group.status]}: pedidos`} />
                </section>
              )
            })
          )}
        </section>

        <section aria-labelledby="presupuestos-title" className="min-w-0 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="presupuestos-title" className="text-2xl">Últimos presupuestos</h2>
            <Link href="/admin/presupuestos" className="inline-flex min-h-11 items-center text-sm font-bold text-violet-deep">
              Ver todos
            </Link>
          </div>
          {quotes.rows.length === 0 ? (
            <EmptyState icon={<Inbox size={24} />} title="Sin solicitudes pendientes">
              Los presupuestos y mensajes de la web llegarán aquí.
            </EmptyState>
          ) : (
            <QuotesList quotes={quotes.rows} label="Presupuestos y mensajes activos" />
          )}
        </section>
      </div>
    </>
  )
}
