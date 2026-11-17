'use client'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Minus, Plus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PALETTE } from '@/lib/editor/constants'

/** Botón redondo con icono (objetivo táctil de 44 px en móvil). */
export function IconButton({
  icon: Icon,
  label,
  pressed,
  className,
  ...rest
}: { icon: LucideIcon; label: string; pressed?: boolean } & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink transition-colors hover:bg-yellow-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper aria-pressed:bg-yellow lg:size-10',
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
    </button>
  )
}

/** Botón con icono y texto, más compacto que .btn, para acciones dentro de los paneles. */
export function ActionButton({
  icon: Icon,
  children,
  className,
  ...rest
}: { icon?: LucideIcon } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-ink bg-paper px-4 text-sm font-extrabold text-ink transition-colors hover:bg-yellow-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon aria-hidden="true" className="size-4" strokeWidth={2.5} />}
      {children}
    </button>
  )
}

export function PanelTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  )
}

export function Group({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-5', className)}>
      {title && <h3 className="mb-2 font-sans text-sm font-extrabold uppercase tracking-wide text-ink-soft">{title}</h3>}
      {children}
    </section>
  )
}

/** Paleta de colores "pop" más un selector nativo para cualquier otro color. */
export function ColorSwatches({
  value,
  onChange,
  label,
  allowCustom = true,
}: {
  value: string
  onChange: (hex: string) => void
  label: string
  allowCustom?: boolean
}) {
  const id = useId()
  const current = value.toLowerCase()
  const inPalette = PALETTE.some((p) => p.hex === current)
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {PALETTE.map((p) => {
        const on = p.hex === current
        return (
          <button
            key={p.hex}
            type="button"
            aria-label={p.name}
            title={p.name}
            aria-pressed={on}
            onClick={() => onChange(p.hex)}
            className={cn(
              'relative inline-flex size-9 items-center justify-center rounded-full border-2 border-ink lg:size-8',
              on && 'ring-2 ring-violet-deep ring-offset-2',
            )}
            style={{ backgroundColor: p.hex }}
          >
            {on && <Check aria-hidden="true" className="size-4" strokeWidth={3.5} style={{ color: isLight(p.hex) ? '#1b1340' : '#ffffff' }} />}
          </button>
        )
      })}
      {allowCustom && (
        <label
          htmlFor={id}
          title="Elegir otro color"
          className={cn(
            'relative inline-flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-ink lg:size-8',
            !inPalette && 'ring-2 ring-violet-deep ring-offset-2',
          )}
          style={{ background: inPalette ? 'conic-gradient(#ff4f9a, #ffc93c, #12c8b4, #4cc9ff, #7b5cff, #ff4f9a)' : value }}
        >
          <span className="sr-only">Elegir otro color</span>
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      )}
    </div>
  )
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 150
}

/** Campo numérico con decimales en castellano (admite coma o punto), pasos con las flechas y validación al salir. */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 0.1,
  unit,
  decimals = 1,
  className,
  hint,
}: {
  label: string
  value: number
  onCommit: (n: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  decimals?: number
  className?: string
  hint?: string
}) {
  const id = useId()
  const format = (n: number) => n.toFixed(decimals).replace('.', ',').replace(/,0+$/, '').replace(/(,\d*?)0+$/, '$1')
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  // Mientras se escribe se muestra el texto en edición; fuera del foco, siempre el valor real.
  const shown = focused ? text : format(value)

  const parse = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'))
    if (!Number.isFinite(n)) return null
    return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="label !mb-1 !text-sm">
        {label}
        {unit && <span className="font-semibold text-ink-soft"> ({unit})</span>}
      </label>
      <input
        id={id}
        className="input !min-h-11 !py-1.5"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onFocus={() => {
          setText(format(value))
          setFocused(true)
        }}
        onChange={(e) => {
          setText(e.target.value)
          const n = parse(e.target.value)
          if (n !== null && /\d$/.test(e.target.value)) onCommit(n)
        }}
        onBlur={() => {
          setFocused(false)
          const n = parse(text)
          if (n !== null) onCommit(n)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            e.stopPropagation()
            const n = parse(text) ?? value
            const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1)))
            setText(format(next))
            onCommit(next)
          }
        }}
      />
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
    </div>
  )
}

/** Selector de cantidad con − y +. */
export function Stepper({
  label,
  unit,
  value,
  onChange,
  min = 0,
  max,
  compact,
}: {
  label: string
  /** Lo que se suma o resta, en singular, para los botones ("Añadir una unidad de taza"); por defecto, `label`. */
  unit?: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  compact?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-1" role="group" aria-labelledby={`${id}-l`}>
      <span id={`${id}-l`} className="sr-only">{label}</span>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full border-2 border-ink bg-paper hover:bg-yellow-soft disabled:opacity-40 disabled:hover:bg-paper lg:size-8"
        aria-label={`Quitar una unidad de ${unit ?? label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden="true" className="size-4" strokeWidth={3} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Cantidad de ${label}`}
        className={cn('input !min-h-11 !rounded-xl !px-1 !py-1 text-center font-extrabold lg:!min-h-8', compact ? 'w-12 lg:w-11' : 'w-16')}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isFinite(n) ? Math.min(max ?? Infinity, n) : 0)
        }}
      />
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full border-2 border-ink bg-paper hover:bg-yellow-soft disabled:opacity-40 disabled:hover:bg-paper lg:size-8"
        aria-label={`Añadir una unidad de ${unit ?? label}`}
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={3} />
      </button>
    </div>
  )
}
