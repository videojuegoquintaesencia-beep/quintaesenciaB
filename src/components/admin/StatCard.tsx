import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TONES = {
  yellow: 'bg-yellow-soft',
  pink: 'bg-pink-soft',
  teal: 'bg-teal-soft',
  violet: 'bg-violet-soft',
} as const

/** Indicador del resumen. Con `href` toda la tarjeta es un enlace a la lista correspondiente. */
export function StatCard({
  label,
  value,
  hint,
  tone,
  href,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone: keyof typeof TONES
  href?: string
  icon?: ReactNode
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-soft sm:text-xs">{label}</p>
        {icon && <span aria-hidden="true" className="hidden sm:block">{icon}</span>}
      </div>
      <p className="mt-1 font-display text-3xl leading-none sm:text-4xl">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-soft sm:text-sm">{hint}</p>}
    </>
  )
  const classes = cn('block rounded-2xl border-2 border-ink p-3.5 shadow-pop-sm sm:p-4', TONES[tone])
  return href ? (
    <Link href={href} className={cn(classes, 'no-underline transition-transform hover:-translate-y-0.5')}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}
