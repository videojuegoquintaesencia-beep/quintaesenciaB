import type { Product } from '@/config/products'
import type { Catalog } from '@/lib/settings-schema'
import { ProductCard } from './ProductCard'

/** Otros productos del catálogo efectivo (con su precio "desde" actual). */
export function RelatedProducts({ current, catalog }: { current: Product; catalog: Catalog }) {
  const others = catalog.products.filter((p) => p.id !== current.id)
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {others.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}
