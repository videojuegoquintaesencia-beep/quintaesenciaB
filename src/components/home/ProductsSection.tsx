import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PRODUCTS } from '@/config/products'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Section, SectionHeading } from '@/components/ui/Section'

export function ProductsSection() {
  return (
    <Section aria-labelledby="productos-titulo" tone="white" className="border-b-2 border-ink">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading id="productos-titulo" eyebrow="Productos" title="Elige qué quieres personalizar">
          Cuatro básicos para empezar. Todos se estampan en DTF a todo color.
        </SectionHeading>
        <Link href="/productos" className="btn btn-sm mb-10 self-start sm:self-auto">
          Ver todos los productos
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {PRODUCTS.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </Section>
  )
}
