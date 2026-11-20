'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, LayoutDashboard, Package, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'

const ITEMS = [
  { href: '/admin', label: 'Resumen', short: 'Resumen', exact: true, icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', short: 'Pedidos', exact: false, icon: Package },
  { href: '/admin/presupuestos', label: 'Presupuestos y mensajes', short: 'Presupuestos', exact: false, icon: Inbox },
  { href: '/admin/ajustes', label: 'Ajustes', short: 'Ajustes', exact: false, icon: Settings },
] as const

/** Navegación principal: lateral en escritorio, barra inferior en móvil. Marca la sección activa. */
export function AdminNav({ variant, newQuotes }: { variant: 'side' | 'bottom'; newQuotes: number }) {
  const pathname = usePathname()

  return (
    <ul className={cn(variant === 'side' ? 'flex flex-col gap-1.5' : 'grid grid-cols-4')}>
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        const badge = item.href === '/admin/presupuestos' && newQuotes > 0 ? newQuotes : 0
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center font-display font-semibold text-ink no-underline',
                variant === 'side' &&
                  'min-h-12 gap-3 rounded-xl border-2 px-3 text-[1.05rem]',
                variant === 'side' && (active ? 'border-ink bg-yellow shadow-pop-sm' : 'border-transparent hover:bg-cream'),
                variant === 'bottom' &&
                  'min-h-16 flex-col justify-center gap-0.5 px-0.5 text-[0.75rem]',
                variant === 'bottom' && (active ? 'bg-yellow' : 'hover:bg-cream'),
              )}
            >
              <Icon size={variant === 'side' ? 20 : 22} aria-hidden="true" />
              <span className={cn(variant === 'bottom' && 'max-w-full truncate leading-tight')}>{variant === 'side' ? item.label : item.short}</span>
              {badge > 0 && (
                <span
                  className={cn(
                    'grid min-w-6 place-items-center rounded-full border-2 border-ink bg-pink px-1.5 text-xs font-extrabold leading-5',
                    variant === 'side' ? 'ml-auto' : 'absolute right-[14%] top-1.5',
                  )}
                >
                  {badge}
                  <span className="sr-only">{badge === 1 ? ' nuevo' : ' nuevos'}</span>
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
