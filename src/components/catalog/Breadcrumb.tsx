import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { site } from '@/config/site'
import { JsonLd } from '@/components/site/JsonLd'

export interface Crumb {
  label: string
  /** Ruta absoluta sin dominio; la última miga (página actual) no lleva. */
  href?: string
}

/** Migas de pan accesibles, con sus datos estructurados (BreadcrumbList). */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="Migas de pan">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-bold text-ink-soft">
          {items.map((item, i) => (
            <li key={item.label} className="inline-flex items-center gap-1.5">
              {item.href ? (
                <Link href={item.href} className="rounded-md py-1 underline-offset-4 hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              )}
              {i < items.length - 1 && <ChevronRight aria-hidden="true" size={15} strokeWidth={3} />}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.label,
            item: item.href ? `${site.url}${item.href}` : undefined,
          })),
        }}
      />
    </>
  )
}
