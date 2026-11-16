import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

/** Cabecera de página: título, descripción opcional, enlace de vuelta y acciones a la derecha. */
export function PageHeader({
  title,
  description,
  back,
  actions,
  badge,
}: {
  title: ReactNode
  description?: ReactNode
  back?: { href: string; label: string }
  actions?: ReactNode
  badge?: ReactNode
}) {
  return (
    <header className="mb-6 print:hidden">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-violet-deep hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl sm:text-4xl">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 max-w-2xl text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
