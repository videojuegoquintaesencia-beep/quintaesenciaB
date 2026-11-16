import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Feature {
  icon: LucideIcon
  title: string
  text: string
}

const TINTS = ['bg-pink-soft', 'bg-yellow-soft', 'bg-teal-soft', 'bg-violet-soft', 'bg-orange-soft', 'bg-sky-soft'] as const

/** Cuadrícula de ventajas con icono, título y texto. */
export function FeatureGrid({ features, columns = 3 }: { features: Feature[]; columns?: 2 | 3 }) {
  return (
    <ul className={cn('grid gap-5 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3')}>
      {features.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="card flex gap-4 p-5">
          <span
            aria-hidden="true"
            className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink', TINTS[i % TINTS.length])}
          >
            <Icon className="size-6" strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-xl">{title}</h3>
            <p className="mt-1.5 text-ink-soft">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
