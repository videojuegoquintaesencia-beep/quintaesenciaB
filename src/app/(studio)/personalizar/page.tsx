import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductMockup } from '@/components/mockups'
import { fromPriceCents } from '@/config/products'
import { formatEUR } from '@/lib/format'
import { getCatalog } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Personaliza tu producto',
  description: 'Elige qué quieres personalizar: camiseta, sudadera con capucha, gorra o taza. Diseña online y mira el resultado al instante.',
  alternates: { canonical: '/personalizar' },
  // El layout del estudio marca todo /personalizar como noindex; esta página de entrada sí debe indexarse (está en el sitemap).
  robots: { index: true, follow: true },
}

const TONES = ['bg-pink-soft', 'bg-yellow-soft', 'bg-teal-soft', 'bg-violet-soft'] as const

export default async function PersonalizarPage() {
  // Precio "desde" efectivo de cada producto (editable en el panel).
  const { products } = await getCatalog()
  return (
    <div className="bg-dots-soft min-h-full px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center sm:mb-10">
          <p className="sticker mb-4 text-sm">Paso 1 de 3</p>
          <h1 className="text-3xl sm:text-5xl">¿Qué quieres personalizar?</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink-soft">
            Elige un producto y pasa al editor: sube tu imagen, añade texto o pegatinas y mira el resultado al momento.
          </p>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          {products.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/personalizar/${p.id}`}
                className="card card-hover group flex h-full flex-col overflow-hidden no-underline"
              >
                <div className={`flex items-center justify-center border-b-2 border-ink p-4 ${TONES[i % TONES.length]}`}>
                  <ProductMockup productId={p.id} className="h-56 w-auto max-w-full object-contain sm:h-64" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="text-2xl">{p.name}</h2>
                  <p className="text-ink-soft">{p.tagline}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <span className="font-bold">Desde {formatEUR(fromPriceCents(p), { compact: true })} <span className="text-sm font-semibold text-ink-soft">IVA incl.</span></span>
                    <span className="btn btn-primary btn-sm" aria-hidden="true">
                      Personalizar <ArrowRight className="size-4" strokeWidth={2.75} />
                    </span>
                  </div>
                </div>
                <span className="sr-only">Personalizar {p.name.toLowerCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
