import Link from 'next/link'
import { Wand2 } from 'lucide-react'
import { fromPriceCents, type Product } from '@/config/products'
import { formatEUR } from '@/lib/format'
import { ProductShowcase } from '@/components/mockups'
import { cn } from '@/lib/cn'
import { PRODUCT_ART, PRODUCT_TINT } from './appearance'

/** Tarjeta de producto: ilustración, nombre, frase, precio "desde" y accesos a la ficha y al personalizador. */
export function ProductCard({ product, className }: { product: Product; className?: string }) {
  return (
    <article className={cn('card card-hover group flex h-full flex-col overflow-hidden', className)}>
      <Link href={`/productos/${product.slug}`} className="flex flex-1 flex-col rounded-t-[1.3rem] focus-visible:outline-offset-[-6px]">
        <div className={cn('grid place-items-center border-b-2 border-ink px-3 py-4 sm:px-6 sm:py-7', PRODUCT_TINT[product.id])}>
          <ProductShowcase
            productId={product.id}
            variant="icon"
            art={PRODUCT_ART[product.id]}
            label=""
            className="h-28 w-full transition-transform sm:h-44 duration-200 group-hover:scale-105 group-hover:-rotate-2 motion-reduce:transition-none"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3.5 pb-2 pt-3 sm:px-5 sm:pb-3 sm:pt-4">
          <h3 className="text-xl sm:text-2xl">{product.namePlural}</h3>
          <p className="text-sm text-ink-soft sm:text-base">{product.tagline}</p>
          <p className="mt-auto pt-3">
            <span className="text-xs font-bold text-ink-soft sm:text-sm">desde </span>
            <span className="font-display text-xl font-semibold sm:text-2xl">{formatEUR(fromPriceCents(product))}</span>
            <span className="block text-xs text-ink-soft sm:text-sm">IVA incluido</span>
          </p>
        </div>
      </Link>
      <div className="px-3.5 pb-3.5 sm:px-5 sm:pb-5">
        <Link href={`/personalizar/${product.id}`} className="btn btn-primary btn-sm btn-block">
          <Wand2 aria-hidden="true" size={17} strokeWidth={2.4} className="hidden sm:block" />
          Personalizar
          <span className="sr-only"> {product.name.toLowerCase()}</span>
        </Link>
      </div>
    </article>
  )
}
