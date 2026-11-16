import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Step {
  title: string
  text: ReactNode
}

const BADGES = ['bg-pink', 'bg-yellow', 'bg-teal', 'bg-orange'] as const

/** Lista numerada de pasos en tarjetas (se apilan en móvil y se reparten en pantallas anchas). */
export function StepList({ steps, label, compact }: { steps: Step[]; label: string; /** Dos columnas como máximo (para cuando va junto a otro bloque). */ compact?: boolean }) {
  return (
    <ol aria-label={label} className={cn('grid gap-x-5 gap-y-8 sm:grid-cols-2', steps.length >= 4 && !compact && 'lg:grid-cols-4')}>
      {steps.map((step, i) => (
        <li key={step.title} className="card relative flex flex-col p-5 pt-8">
          <span
            aria-hidden="true"
            className={cn(
              'absolute -top-4 left-5 flex size-10 items-center justify-center rounded-full border-2 border-ink font-display text-xl font-semibold shadow-pop-sm',
              BADGES[i % BADGES.length],
            )}
          >
            {i + 1}
          </span>
          <h3 className="text-xl">
            <span className="sr-only">Paso {i + 1}: </span>
            {step.title}
          </h3>
          <p className="mt-2 text-ink-soft">{step.text}</p>
        </li>
      ))}
    </ol>
  )
}
