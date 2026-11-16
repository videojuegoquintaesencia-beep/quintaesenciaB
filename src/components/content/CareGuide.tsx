import { Check } from 'lucide-react'
import { PRODUCTS } from '@/config/products'

/** Consejos de cuidado de cada producto (los mismos de la ficha de producto). */
export function CareGuide() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {PRODUCTS.map((p) => (
        <li key={p.id} className="card p-5">
          <h3 className="text-xl">{p.namePlural}</h3>
          <ul className="mt-3 grid gap-2">
            {p.care.map((tip) => (
              <li key={tip} className="flex gap-2.5">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-teal-deep" strokeWidth={3} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
