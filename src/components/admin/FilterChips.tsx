import Link from 'next/link'
import { cn } from '@/lib/cn'

export interface Chip {
  key: string
  label: string
  href: string
  count?: number
}

/**
 * Filtros como enlaces (la lista se renderiza en el servidor a partir de la URL).
 * En móvil se desplazan en horizontal para no ocupar media pantalla.
 */
export function FilterChips({ label, chips, active }: { label: string; chips: Chip[]; active: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
      <ul className="flex gap-2 sm:flex-wrap">
        {chips.map((chip) => {
          const on = chip.key === active
          return (
            <li key={chip.key} className="shrink-0">
              <Link
                href={chip.href}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink px-4 text-sm font-bold no-underline',
                  on ? 'bg-ink text-cream' : 'bg-paper text-ink hover:bg-yellow-soft',
                )}
              >
                {chip.label}
                {chip.count !== undefined && (
                  <span
                    className={cn(
                      'min-w-6 rounded-full px-1.5 text-center text-xs leading-5',
                      on ? 'bg-cream text-ink' : 'bg-violet-soft text-ink',
                    )}
                  >
                    {chip.count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
