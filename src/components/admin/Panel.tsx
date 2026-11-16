import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TONES = {
  white: 'bg-paper',
  yellow: 'bg-yellow-soft',
  pink: 'bg-pink-soft',
  teal: 'bg-teal-soft',
  violet: 'bg-violet-soft',
} as const

/** Bloque con borde de tinta y sombra suave: la unidad básica de las pantallas del panel. */
export function Panel({
  title,
  icon,
  actions,
  tone = 'white',
  className,
  id,
  children,
}: {
  title?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  tone?: keyof typeof TONES
  className?: string
  id?: string
  children: ReactNode
}) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn('rounded-2xl border-2 border-ink p-4 shadow-pop-sm sm:p-5', TONES[tone], className)}
    >
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 id={headingId} className="flex items-center gap-2 text-lg sm:text-xl">
              {icon && <span aria-hidden="true" className="text-ink-soft">{icon}</span>}
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
