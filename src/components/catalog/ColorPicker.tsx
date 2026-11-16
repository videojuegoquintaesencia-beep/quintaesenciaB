'use client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatEUR } from '@/lib/format'
import { useProductSelection } from './ProductSelection'

/** Selector de color: botones reales con nombre visible (no depende solo del color) y `aria-pressed`. */
export function ColorPicker() {
  const { product, color, setColorId } = useProductSelection()
  const isMug = product.id === 'taza'
  const legendId = `color-${product.id}`

  return (
    <div role="group" aria-labelledby={legendId}>
      <p id={legendId} className="label">
        {isMug ? 'Color del interior y del asa' : 'Color'}:{' '}
        <span className="font-bold text-ink-soft" aria-live="polite">
          {color.name}
        </span>
      </p>
      <ul className="flex flex-wrap gap-2">
        {product.colors.map((c) => {
          const selected = c.id === color.id
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setColorId(c.id)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink py-1 pl-1.5 pr-3.5 text-[0.95rem] font-bold transition-colors',
                  selected ? 'bg-yellow shadow-pop-sm' : 'bg-paper hover:bg-yellow-soft',
                )}
              >
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink"
                  style={{ backgroundColor: c.hex }}
                >
                  {selected && <Check size={15} strokeWidth={4} color={c.light ? '#1b1340' : '#ffffff'} />}
                </span>
                {c.name}
                {c.surchargeCents ? <span className="text-sm font-semibold text-ink-soft">+{formatEUR(c.surchargeCents)}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
