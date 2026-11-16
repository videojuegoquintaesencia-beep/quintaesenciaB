'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, isActivePath } from './nav'

/** Navegación principal de escritorio, con la sección actual marcada (aria-current). */
export function MainNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const active = isActivePath(pathname, link.href)
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className="inline-flex min-h-11 items-center rounded-full border-2 border-transparent px-4 font-display text-[1.05rem] font-semibold text-ink transition-colors hover:bg-yellow-soft aria-[current=page]:border-ink aria-[current=page]:bg-yellow"
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
