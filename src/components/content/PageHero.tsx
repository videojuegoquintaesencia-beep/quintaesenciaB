import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'

const TONES = {
  pink: 'bg-pink-soft',
  yellow: 'bg-yellow-soft',
  teal: 'bg-teal-soft',
  violet: 'bg-violet-soft',
} as const

/** Cabecera de las páginas informativas: migas, sello, título, texto y acciones. */
export function PageHero({
  tone = 'yellow',
  crumbs,
  eyebrow,
  title,
  children,
  actions,
}: {
  tone?: keyof typeof TONES
  crumbs: Crumb[]
  eyebrow?: string
  title: ReactNode
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className={cn('relative overflow-hidden border-b-2 border-ink', TONES[tone])}>
      <div aria-hidden="true" className="bg-dots-soft pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-8 hidden size-44 rounded-full border-2 border-ink bg-yellow lg:block" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-6 right-40 hidden size-20 rotate-12 rounded-2xl border-2 border-ink bg-pink lg:block" />
      <div aria-hidden="true" className="pointer-events-none absolute right-16 top-48 hidden size-12 rounded-full border-2 border-ink bg-teal lg:block" />
      <div className="container-pop relative py-10 sm:py-16">
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 max-w-3xl">
          {eyebrow && <p className="sticker mb-5 text-sm">{eyebrow}</p>}
          <h1 className="text-4xl sm:text-6xl">{title}</h1>
          {children && <p className="mt-5 max-w-2xl text-lg text-ink-soft sm:text-xl">{children}</p>}
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </header>
  )
}
