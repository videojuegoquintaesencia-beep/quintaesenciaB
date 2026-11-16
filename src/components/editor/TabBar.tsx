'use client'
import { useRef, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface TabDef<T extends string> {
  id: T
  label: string
  icon: LucideIcon
  badge?: number
}

/** Pestañas accesibles (flechas, Inicio y Fin) con icono y texto. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: {
  tabs: TabDef<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  idPrefix: string
  className?: string
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    const id = tabs[next].id
    onChange(id)
    refs.current[id]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('flex', className)}>
      {tabs.map((t) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-b-4 px-1 py-1 text-[0.72rem] font-extrabold leading-tight transition-colors sm:text-xs',
              selected ? 'border-pink bg-pink-soft text-ink' : 'border-transparent text-ink-soft hover:bg-yellow-soft hover:text-ink',
            )}
          >
            <t.icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={2.25} />
            <span className="truncate">{t.label}</span>
            {!!t.badge && (
              <span className="absolute right-1 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full border border-ink bg-yellow px-1 text-[0.65rem] leading-4">
                {t.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
