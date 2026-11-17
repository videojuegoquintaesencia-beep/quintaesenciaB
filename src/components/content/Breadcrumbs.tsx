import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { site } from '@/config/site'
import { JsonLd } from './JsonLd'

export interface Crumb {
  label: string
  href?: string
}

/** Migas de pan accesibles + BreadcrumbList para buscadores. La última miga es la página actual. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: 'Inicio', href: '/' }, ...items]
  // Schema.org exige URL en todas las migas salvo la última: las migas sin enlace intermedias (p. ej. "Legal") no se incluyen.
  const linked = all.filter((c, i) => c.href || i === all.length - 1)
  const list = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: linked.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${site.url}${c.href === '/' ? '' : c.href}` } : {}),
    })),
  }
  return (
    <nav aria-label="Migas de pan" className="text-sm print:hidden">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink-soft">
        {all.map((c, i) => {
          const last = i === all.length - 1
          return (
            <li key={c.label} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="inline-flex min-h-6 items-center font-bold underline-offset-4 hover:underline pointer-coarse:min-h-11">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="font-bold text-ink">
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden="true" className="size-4" />}
            </li>
          )
        })}
      </ol>
      <JsonLd data={list} />
    </nav>
  )
}
