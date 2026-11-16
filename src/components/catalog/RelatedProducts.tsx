import { PRODUCTS, type Product } from '@/config/products'
import { ProductCard } from './ProductCard'

/** Otros productos del catálogo. */
export function RelatedProducts({ current }: { current: Product }) {
  const others = PRODUCTS.filter((p) => p.id !== current.id)
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
