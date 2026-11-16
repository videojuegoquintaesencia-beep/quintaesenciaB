'use client'
import { Check } from 'lucide-react'
import { QUOTE_PRODUCT_LABELS, type QuoteProduct } from '@/lib/quote-form'
import { QUOTE_PRODUCT_OPTIONS } from '@/lib/validators'

/** Selección múltiple de productos con chips (casillas reales ocultas visualmente, accesibles con teclado). */
export function ProductChips({
  id,
  value,
  error,
  onChange,
}: {
  id: string
  value: QuoteProduct[]
  error?: string
  onChange: (next: QuoteProduct[]) => void
}) {
  const toggle = (option: QuoteProduct) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])

  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={error ? `${id}-error` : undefined} className="outline-none">
      <legend className="label">
        ¿Qué quieres personalizar?<span aria-hidden="true" className="text-pink-deep"> *</span>
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {QUOTE_PRODUCT_OPTIONS.map((option) => (
          <label
            key={option}
            className="group chip min-h-11 cursor-pointer bg-paper px-4 text-base has-checked:bg-yellow has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-violet"
          >
            <input
              type="checkbox"
              name="products"
              value={option}
              checked={value.includes(option)}
              onChange={() => toggle(option)}
              className="sr-only"
            />
            <Check aria-hidden="true" className="hidden size-4 group-has-checked:block" strokeWidth={3} />
            {QUOTE_PRODUCT_LABELS[option]}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
