import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/admin/EmptyState'
import { FilterChips, type Chip } from '@/components/admin/FilterChips'
import { PageHeader } from '@/components/admin/PageHeader'
import { Pagination } from '@/components/admin/Pagination'
import { QuotesList } from '@/components/admin/QuotesList'
import { SearchForm } from '@/components/admin/SearchForm'
import { Tabs } from '@/components/admin/Tabs'
import { listQuotes } from '@/lib/quotes'
import { requireAdmin } from '@/lib/auth'
import { hrefWith, type SearchParams } from '@/lib/admin/params'
import { parseQuotesFilters, QUOTES_PAGE_SIZE, type QuotesStatusFilter } from '@/lib/admin/quotes-filters'

export const metadata: Metadata = { title: 'Presupuestos y mensajes' }

const BASE = '/admin/presupuestos'

const STATUS_CHIPS: { key: QuotesStatusFilter; label: string }[] = [
  { key: 'active', label: 'Pendientes' },
  { key: 'new', label: 'Nuevos' },
  { key: 'contacted', label: 'Contactados' },
  { key: 'quoted', label: 'Presupuesto enviado' },
  { key: 'won', label: 'Ganados' },
  { key: 'lost', label: 'Perdidos' },
  { key: 'archived', label: 'Archivados' },
  { key: 'all', label: 'Todos' },
]

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const { tab, kind, status, q, page } = parseQuotesFilters(await searchParams)

  const link = (changes: { tipo?: string; estado?: string; q?: string; pagina?: number } = {}) => {
    const next = { tipo: tab, estado: status, q, pagina: undefined as number | undefined, ...changes }
    return hrefWith(BASE, {
      tipo: next.tipo === 'presupuestos' ? undefined : next.tipo,
      estado: next.estado === 'active' ? undefined : next.estado,
      q: next.q,
      pagina: next.pagina && next.pagina > 1 ? next.pagina : undefined,
    })
  }

  const [result, newQuotes, newMessages] = await Promise.all([
    listQuotes({ kind, status, q, limit: QUOTES_PAGE_SIZE, offset: (page - 1) * QUOTES_PAGE_SIZE }),
    listQuotes({ kind: 'quote', status: 'new', limit: 1 }),
    listQuotes({ kind: 'contact', status: 'new', limit: 1 }),
  ])

  const totalPages = Math.max(1, Math.ceil(result.total / QUOTES_PAGE_SIZE))
  if (page > totalPages) redirect(link({ pagina: totalPages }))

  const chips: Chip[] = STATUS_CHIPS.map((c) => ({ key: c.key, label: c.label, href: link({ estado: c.key }) }))
  const noun = kind === 'quote' ? 'presupuestos' : 'mensajes'
  const hasFilters = q !== '' || status !== 'active'

  return (
    <>
      <PageHeader
        title="Presupuestos y mensajes"
        description="Solicitudes de empresas, equipos y eventos, y mensajes del formulario de contacto."
      />

      <Tabs
        label="Tipo de solicitud"
        active={tab}
        tabs={[
          { key: 'presupuestos', label: 'Presupuestos', href: link({ tipo: 'presupuestos', pagina: 1 }), badge: newQuotes.total },
          { key: 'mensajes', label: 'Mensajes', href: link({ tipo: 'mensajes', pagina: 1 }), badge: newMessages.total },
        ]}
      />

      <div className="mb-5 space-y-4">
        <FilterChips label="Filtrar por estado" chips={chips} active={status} />
        <SearchForm
          action={BASE}
          value={q}
          label={`Buscar entre los ${noun}`}
          placeholder="Nombre, email o empresa"
          hidden={{
            tipo: tab === 'presupuestos' ? undefined : tab,
            estado: status === 'active' ? undefined : status,
          }}
          clearHref={link({ q: '' })}
        />
      </div>

      <p className="mb-3 text-sm font-semibold text-ink-soft" aria-live="polite">
        {result.total === 0 ? 'Sin resultados' : `${result.total} ${result.total === 1 ? (kind === 'quote' ? 'presupuesto' : 'mensaje') : noun}${q ? ` para «${q}»` : ''}`}
      </p>

      {result.rows.length === 0 ? (
        <EmptyState icon={<Inbox size={24} />} title={hasFilters ? `No hay ${noun} con estos filtros` : `No tienes ${noun} pendientes`}>
          {hasFilters ? (
            <>
              Prueba con otro estado o quita la búsqueda.{' '}
              <Link href={link({ estado: 'all', q: '' })} className="font-bold text-violet-deep">
                Ver todos
              </Link>
            </>
          ) : kind === 'quote' ? (
            'Las solicitudes del formulario de empresas llegarán aquí.'
          ) : (
            'Los mensajes del formulario de contacto llegarán aquí.'
          )}
        </EmptyState>
      ) : (
        <>
          <QuotesList quotes={result.rows} label={noun} />
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => link({ pagina: p })} />
        </>
      )}
    </>
  )
}
