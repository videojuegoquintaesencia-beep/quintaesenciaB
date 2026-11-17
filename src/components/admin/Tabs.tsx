import Link from 'next/link'
import { cn } from '@/lib/cn'

export interface TabItem {
  key: string
  label: string
  href: string
  /** Número de elementos nuevos (se muestra como globo). */
  badge?: number
}

/** Pestañas como enlaces: cada pestaña es una URL (se pueden compartir y funcionan sin JavaScript). */
export function Tabs({ label, tabs, active }: { label: string; tabs: TabItem[]; active: string }) {
  return (
    <nav aria-label={label} className="mb-5 overflow-x-auto border-b-2 border-ink">
      <ul className="flex gap-2">
        {tabs.map((tab) => {
          const on = tab.key === active
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  '-mb-0.5 inline-flex min-h-12 items-center gap-2 rounded-t-xl border-2 border-b-0 px-4 font-display text-lg font-semibold no-underline',
                  on ? 'border-ink bg-yellow' : 'border-transparent text-ink-soft hover:bg-yellow-soft hover:text-ink',
                )}
              >
                {tab.label}
                {tab.badge ? (
                  <span className="grid min-w-6 place-items-center rounded-full border-2 border-ink bg-pink px-1.5 text-xs font-extrabold leading-5 text-ink">
                    {tab.badge}
                    <span className="sr-only">{tab.badge === 1 ? ' nuevo' : ' nuevos'}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
