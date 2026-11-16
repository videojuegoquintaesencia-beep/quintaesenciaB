import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, Truck, Wand2 } from 'lucide-react'
import { PRODUCTS, QUANTITY_DISCOUNTS } from '@/config/products'
import { site } from '@/config/site'
import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { CategoryFilter, parseCategory } from '@/components/catalog/CategoryFilter'
import { ProductCard } from '@/components/catalog/ProductCard'
import { CATEGORY_LABELS } from '@/components/catalog/appearance'
import { JsonLd } from '@/components/site/JsonLd'
import { formatEUR } from '@/lib/format'

const title = 'Productos personalizables: camisetas, sudaderas, gorras y tazas'
const description =
  'Elige tu producto y diséñalo online: camisetas, sudaderas con capucha, gorras y tazas con impresión DTF. Sin mínimo de unidades y con precios claros, IVA incluido.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/productos' },
  openGraph: { title, description, url: '/productos', type: 'website', locale: 'es_ES', siteName: site.name },
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { categoria } = await searchParams
  const active = parseCategory(categoria)
  const products = active ? PRODUCTS.filter((p) => p.category === active) : PRODUCTS
  const maxDiscount = Math.max(...QUANTITY_DISCOUNTS.map((d) => d.pct))

  return (
    <>
      <section className="bg-dots-soft border-b-2 border-ink bg-cream">
        <div className="container-pop py-10 sm:py-14">
          <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Productos' }]} />
          <h1 className="mt-5 text-4xl sm:text-6xl">
            Elige qué quieres <span className="squiggle-underline">personalizar</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Todos los productos se estampan con DTF a todo color y se pueden pedir desde una sola unidad. Elige uno, sube tu logo o tu
            foto, añade texto y mira el resultado y el precio al momento.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14" aria-labelledby="catalogo">
        <div className="container-pop">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="catalogo" className="text-2xl sm:text-3xl">
              {active ? CATEGORY_LABELS[active] : 'Todos los productos'}
              <span className="ml-2 text-lg font-bold text-ink-soft">
                ({products.length} {products.length === 1 ? 'producto' : 'productos'})
              </span>
            </h2>
            <CategoryFilter active={active} />
          </div>

          {products.length > 0 ? (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card mt-8 p-8 text-center">
              <p className="text-xl font-bold">Todavía no hay productos en esta categoría.</p>
              <Link href="/productos" className="btn btn-secondary mt-5">
                Ver todos los productos
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-t-2 border-ink bg-yellow-soft py-12 sm:py-16" aria-labelledby="antes-de-elegir">
        <div className="container-pop">
          <h2 id="antes-de-elegir" className="text-2xl sm:text-3xl">
            Antes de elegir
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            <li className="card flex gap-4 p-5">
              <Wand2 aria-hidden="true" className="mt-1 shrink-0 text-violet-deep" size={28} />
              <div>
                <h3 className="text-xl">Precio claro</h3>
                <p className="mt-1 text-ink-soft">
                  Pagas el producto más el estampado de cada zona, según el espacio que ocupe tu diseño. Todo con IVA incluido y visible
                  mientras diseñas.
                </p>
              </div>
            </li>
            <li className="card flex gap-4 p-5">
              <Building2 aria-hidden="true" className="mt-1 shrink-0 text-violet-deep" size={28} />
              <div>
                <h3 className="text-xl">Descuentos por volumen</h3>
                <p className="mt-1 text-ink-soft">
                  Hasta un {maxDiscount} % menos cuando pides muchas unidades iguales.{' '}
                  <Link href="/empresas" className="inline-flex items-center gap-1 font-bold text-violet-deep underline underline-offset-4">
                    Pedidos para empresas <ArrowRight aria-hidden="true" size={15} />
                  </Link>
                </p>
              </div>
            </li>
            <li className="card flex gap-4 p-5">
              <Truck aria-hidden="true" className="mt-1 shrink-0 text-violet-deep" size={28} />
              <div>
                <h3 className="text-xl">Envío a toda España</h3>
                <p className="mt-1 text-ink-soft">
                  Producción en {site.production.leadDaysMin}–{site.production.leadDaysMax} días laborables y {site.shipping.carrierLabel}. Gratis
                  desde {formatEUR(site.shipping.freeFromCents, { compact: true })}, salvo {site.shipping.excludedZonesLabel}.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Productos personalizables',
          itemListElement: PRODUCTS.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.namePlural,
            url: `${site.url}/productos/${p.slug}`,
          })),
        }}
      />
    </>
  )
}
