import { Droplets } from 'lucide-react'
import type { Product } from '@/config/products'

/** Ficha técnica y cuidados del producto. */
export function ProductDetails({ product }: { product: Product }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-flat overflow-hidden">
        <h3 className="border-b-2 border-ink bg-yellow-soft px-5 py-3 text-xl">Ficha técnica</h3>
        <dl>
          {product.specs.map((spec) => (
            <div key={spec.label} className="grid gap-0.5 border-b border-ink/15 px-5 py-3 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-bold">{spec.label}</dt>
              <dd className="text-ink-soft">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="card-flat overflow-hidden">
        <h3 className="border-b-2 border-ink bg-teal-soft px-5 py-3 text-xl">Cuidados para que dure más</h3>
        <ul className="grid gap-3 p-5">
          {product.care.map((tip) => (
            <li key={tip} className="flex gap-3">
              <Droplets aria-hidden="true" size={20} className="mt-1 shrink-0 text-teal-deep" />
              <span className="text-ink-soft">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
