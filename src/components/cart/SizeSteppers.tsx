'use client'
import { Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { isSingleSize, type Product } from '@/config/products'
import { cn } from '@/lib/cn'
import { totalQuantity } from '@/lib/pricing'

function Stepper({
  label,
  value,
  onChange,
  canDecrease,
  canIncrease,
  large,
  left,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  canDecrease: boolean
  canIncrease: boolean
  large?: boolean
  left?: boolean
}) {
  const btn =
    'flex size-9 shrink-0 items-center pointer-coarse:size-11 justify-center rounded-full border-2 border-ink bg-paper text-ink transition-colors hover:bg-yellow-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper'
  return (
    <div className={cn('flex items-center gap-1.5', left ? 'justify-start' : 'justify-center')}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={!canDecrease} aria-label={`Quitar una unidad, ${label}`}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.floor(Number(e.target.value) || 0))}
        aria-label={`Unidades, ${label}`}
        className={cn(
          'h-9 rounded-xl border-2 border-ink bg-paper text-center pointer-coarse:h-11 font-display font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          large ? 'w-16 text-lg' : 'w-11',
        )}
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={!canIncrease} aria-label={`Añadir una unidad, ${label}`}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

/** Cantidades por talla (o una sola cantidad en productos de talla única). */
export function SizeSteppers({
  product,
  sizes,
  onChange,
}: {
  product: Product
  sizes: Record<string, number>
  onChange: (next: Record<string, number>) => void
}) {
  const total = totalQuantity(sizes)
  const atMax = total >= product.maxQtyPerLine

  /** Aplica el cambio de una talla garantizando entre 1 y el máximo de unidades en la línea. */
  function set(sizeId: string, qty: number) {
    const current = sizes[sizeId] ?? 0
    const others = total - current
    const clamped = Math.max(0, Math.min(qty, product.maxQtyPerLine - others))
    if (others + clamped < 1) return
    const next = { ...sizes, [sizeId]: clamped }
    for (const key of Object.keys(next)) if (!next[key]) delete next[key]
    onChange(next)
  }

  if (isSingleSize(product)) {
    const id = product.sizes[0].id
    return (
      <div>
        <Stepper
          large
          left
          label={product.name}
          value={sizes[id] ?? 0}
          onChange={(n) => set(id, n)}
          canDecrease={total > 1}
          canIncrease={!atMax}
        />
        {atMax && <MaxHint max={product.maxQtyPerLine} />}
      </div>
    )
  }

  return (
    <div>
      <ul className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3">
        {product.sizes.map((s) => {
          const qty = sizes[s.id] ?? 0
          return (
            <li key={s.id} className={cn('rounded-2xl border-2 px-2 py-2', qty > 0 ? 'border-ink bg-yellow-soft' : 'border-ink/25 bg-paper')}>
              <p className="mb-1 text-center text-sm font-extrabold">Talla {s.label}</p>
              <Stepper
                label={`talla ${s.label}`}
                value={qty}
                onChange={(n) => set(s.id, n)}
                canDecrease={qty > 0 && total > 1}
                canIncrease={!atMax}
              />
            </li>
          )
        })}
      </ul>
      {atMax && <MaxHint max={product.maxQtyPerLine} />}
    </div>
  )
}

function MaxHint({ max }: { max: number }) {
  return (
    <p className="mt-2 text-sm text-ink-soft">
      Máximo {max} unidades por línea. Para más,{' '}
      <Link href="/empresas" className="font-bold text-violet-deep underline">
        pídenos presupuesto
      </Link>
      .
    </p>
  )
}
