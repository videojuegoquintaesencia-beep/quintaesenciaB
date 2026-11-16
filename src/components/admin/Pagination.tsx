import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { pageWindow } from '@/lib/admin/params'

const cell =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 px-3 text-sm font-bold no-underline'

/** Paginación por enlaces: anterior/siguiente siempre, y números de página en pantallas anchas. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold text-ink-soft">
        Página {page} de {totalPages}
      </p>
      <ul className="flex items-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={cn(cell, 'border-ink bg-paper hover:bg-yellow-soft')}>
              <ChevronLeft size={18} aria-hidden="true" />
              Anterior
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(cell, 'border-ink/25 text-ink/40')}>
              <ChevronLeft size={18} aria-hidden="true" />
              Anterior
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="hidden px-1 text-ink-soft sm:block">
              …
            </li>
          ) : (
            <li key={p} className="hidden sm:block">
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
                className={cn(cell, p === page ? 'border-ink bg-ink text-cream' : 'border-ink bg-paper hover:bg-yellow-soft')}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} rel="next" className={cn(cell, 'border-ink bg-paper hover:bg-yellow-soft')}>
              Siguiente
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(cell, 'border-ink/25 text-ink/40')}>
              Siguiente
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
