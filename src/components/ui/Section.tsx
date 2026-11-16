import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TONES = {
  cream: 'bg-cream',
  white: 'bg-paper',
  pink: 'bg-pink-soft',
  yellow: 'bg-yellow-soft',
  teal: 'bg-teal-soft',
  violet: 'bg-violet-soft',
  sky: 'bg-sky-soft',
  ink: 'bg-ink text-cream',
} as const

export type SectionTone = keyof typeof TONES

/** Bloque de página a todo el ancho con contenedor centrado. */
export function Section({
  id,
  tone = 'cream',
  className,
  innerClassName,
  children,
  ...rest
}: {
  id?: string
  tone?: SectionTone
  className?: string
  innerClassName?: string
  children: ReactNode
  'aria-labelledby'?: string
}) {
  return (
    <section id={id} className={cn('py-14 sm:py-20', TONES[tone], className)} {...rest}>
      <div className={cn('container-pop', innerClassName)}>{children}</div>
    </section>
  )
}

/** Cabecera de sección: etiqueta pequeña + título + texto. */
export function SectionHeading({
  eyebrow,
  title,
  children,
  align = 'left',
  id,
}: {
  eyebrow?: string
  title: ReactNode
  children?: ReactNode
  align?: 'left' | 'center'
  id?: string
}) {
  return (
    <div className={cn('mb-10 max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="sticker mb-4 text-sm">{eyebrow}</p>}
      <h2 id={id} className="text-3xl sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-ink-soft">{children}</p>}
    </div>
  )
}
