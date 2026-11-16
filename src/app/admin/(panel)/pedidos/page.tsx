import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download, PackageSearch } from 'lucide-react'
import { EmptyState } from '@/components/admin/EmptyState'
import { FilterChips, type Chip } from '@/components/admin/FilterChips'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { PageHeader } from '@/components/admin/PageHeader'
import { Pagination } from '@/components/admin/Pagination'
import { SearchForm } from '@/components/admin/SearchForm'
import { ButtonLink } from '@/components/ui/Button'
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from '@/lib/order-status'
import { getOrderStats, listOrders } from '@/lib/orders'
import { ORDERS_PAGE_SIZE, parseOrdersFilters } from '@/lib/admin/orders-filters'
import { hrefWith, type SearchParams } from '@/lib/admin/params'

export const metadata: Metadata = { title: 'Pedidos' }

const BASE = '/admin/pedidos'

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseOrdersFilters(await searchParams)
  const { status, q, includeUnpaid, page } = filters

  /** URL con los filtros actuales y los cambios indicados (cambiar un filtro vuelve a la página 1). */
  const link = (changes: { estado?: string; q?: string; pendientes?: boolean; pagina?: number } = {}) => {
    const next = { estado: status, q, pendientes: includeUnpaid, pagina: undefined as number | undefined, ...changes }
    return hrefWith(BASE, {
      estado: next.estado === 'open' ? undefined : next.estado,
      q: next.q,
      pendientes: next.pendientes ? '1' : undefined,
      pagina: next.pagina && next.pagina > 1 ? next.pagina : undefined,
    })
  }

  const [stats, result] = await Promise.all([
    getOrderStats(),
    listOrders({
      status,
      q,
      includeUnpaid,
      limit: ORDERS_PAGE_SIZE,
      offset: (page - 1) * ORDERS_PAGE_SIZE,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(result.total / ORDERS_PAGE_SIZE))
  if (page > totalPages) redirect(link({ pagina: totalPages }))

  const c = stats.countsByStatus
  const chips: Chip[] = [
    { key: 'open', label: 'En curso', href: link({ estado: 'open' }), count: c.paid + c.in_production + c.ready + c.shipped },
    { key: 'active', label: 'Por procesar', href: link({ estado: 'active' }), count: c.paid + c.in_production + c.ready },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_LABEL[s], href: link({ estado: s }), count: c[s] })),
    {
      key: 'all',
      label: 'Todos',
      href: link({ estado: 'all' }),
      count: ORDER_STATUSES.reduce((n, s) => n + (s === 'pending_payment' && !includeUnpaid ? 0 : c[s]), 0),
    },
  ]

  const exportHref = hrefWith('/api/admin/orders/export', {
    estado: status,
    q,
    pendientes: includeUnpaid ? '1' : undefined,
  })
  const hasFilters = q !== '' || status !== 'open'

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Entra en un pedido para descargar los archivos de impresión y cambiar su estado."
        actions={
          <ButtonLink href={exportHref} prefetch={false} variant="secondary" download>
            <Download size={18} aria-hidden="true" />
            Exportar CSV
          </ButtonLink>
        }
      />

      <div className="mb-5 space-y-4">
        <FilterChips label="Filtrar por estado" chips={chips} active={status} />
        <SearchForm
          action={BASE}
          value={q}
          label="Buscar pedidos"
          placeholder="PU-1042, nombre, email, empresa"
          hidden={{ estado: status === 'open' ? undefined : status, pendientes: includeUnpaid ? '1' : undefined }}
          clearHref={link({ q: '' })}
        />
        {status === 'all' && (
          <p className="text-sm">
            <Link
              href={link({ pendientes: !includeUnpaid })}
              className="inline-flex min-h-11 items-center gap-2 font-bold text-violet-deep"
            >
              <span
                aria-hidden="true"
                className={`grid size-5 place-items-center rounded-md border-2 border-ink text-xs ${includeUnpaid ? 'bg-ink text-cream' : 'bg-paper'}`}
              >
                {includeUnpaid ? '✓' : ''}
              </span>
              {includeUnpaid ? 'Mostrando' : 'Mostrar también'} los pedidos pendientes de pago
              <span className="sr-only">{includeUnpaid ? ' (activado, pulsa para ocultarlos)' : ' (desactivado, pulsa para incluirlos)'}</span>
            </Link>
          </p>
        )}
      </div>

      <p className="mb-3 text-sm font-semibold text-ink-soft" aria-live="polite">
        {result.total === 0
          ? 'Sin resultados'
          : `${result.total} ${result.total === 1 ? 'pedido' : 'pedidos'}${q ? ` para «${q}»` : ''}`}
      </p>

      {result.rows.length === 0 ? (
        <EmptyState icon={<PackageSearch size={24} />} title={hasFilters ? 'No hay pedidos con estos filtros' : 'Todavía no hay pedidos por procesar'}>
          {hasFilters ? (
            <>
              Prueba con otro estado o quita la búsqueda.{' '}
              <Link href={BASE} className="font-bold text-violet-deep">Ver los pedidos por procesar</Link>
            </>
          ) : (
            'Cuando un cliente pague un pedido aparecerá aquí.'
          )}
        </EmptyState>
      ) : (
        <>
          <OrdersTable orders={result.rows} caption="Pedidos" />
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => link({ pagina: p })} />
        </>
      )}
    </>
  )
}
