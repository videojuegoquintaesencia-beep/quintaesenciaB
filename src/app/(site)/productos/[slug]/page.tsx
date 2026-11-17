import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { PRODUCTS, fromPriceCents, getProductBySlug, isSingleSize } from '@/config/products'
import { site } from '@/config/site'
import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { ColorPicker } from '@/components/catalog/ColorPicker'
import { PersonalizeLink } from '@/components/catalog/PersonalizeLink'
import { PrintZones } from '@/components/catalog/PrintZones'
import { ProductDetails } from '@/components/catalog/ProductDetails'
import { ProductFaq } from '@/components/catalog/ProductFaq'
import { ProductGallery } from '@/components/catalog/ProductGallery'
import { ProductPricing } from '@/components/catalog/ProductPricing'
import { ProductSelectionProvider } from '@/components/catalog/ProductSelection'
import { RelatedProducts } from '@/components/catalog/RelatedProducts'
import { ShippingSummary } from '@/components/catalog/ShippingSummary'
import { CATEGORY_LABELS, seoTitle, truncate } from '@/components/catalog/appearance'
import { productFaqs } from '@/components/catalog/product-faqs'
import { JsonLd } from '@/components/site/JsonLd'
import { Section, SectionHeading } from '@/components/ui/Section'
import { formatEUR } from '@/lib/format'
import { OG_SIZE, productImagePath } from '@/lib/og-meta'

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }))
}

// Los productos son un catálogo cerrado: cualquier otro slug responde 404 con la página de error de toda la web.
export const dynamicParams = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return { title: 'Página no encontrada', robots: { index: false } }
  const title = `${seoTitle(product)} con impresión DTF`
  const description = truncate(`Desde ${formatEUR(fromPriceCents(product))} (IVA incluido). ${product.description}`, 158)
  const path = `/productos/${product.slug}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      locale: 'es_ES',
      siteName: site.name,
      images: [{ url: productImagePath(product.slug), ...OG_SIZE, alt: `${seoTitle(product)}: ${product.tagline}` }],
    },
    twitter: { card: 'summary_large_image', images: [productImagePath(product.slug)] },
  }
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) notFound()

  const fromCents = fromPriceCents(product)
  const cheapestPrint = fromCents - product.basePriceCents
  const title = seoTitle(product)
  const url = `${site.url}/productos/${product.slug}`
  const faqs = productFaqs(product)

  return (
    <ProductSelectionProvider productId={product.id}>
      <div className="container-pop py-6 sm:py-10">
        <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Productos', href: '/productos' }, { label: product.name }]} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery />
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <p className="chip bg-pink-soft">{CATEGORY_LABELS[product.category]}</p>
              <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
              <p className="mt-3 text-xl font-bold text-violet-deep">{product.tagline}</p>
              <p className="mt-3 text-ink-soft">{product.description}</p>
            </div>

            <div className="card bg-yellow-soft p-5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-bold text-ink-soft">Desde</span>
                <span className="font-display text-5xl font-bold">{formatEUR(fromCents)}</span>
                <span className="font-bold text-ink-soft">IVA incluido</span>
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Por unidad: {product.name.toLowerCase()} desde {formatEUR(product.basePriceCents)} más el estampado de una zona desde{' '}
                {formatEUR(cheapestPrint)}.{' '}
                <a href="#precio" className="font-bold text-violet-deep underline underline-offset-4">
                  Cómo se calcula el precio
                </a>
              </p>
            </div>

            <ColorPicker />

            <p className="text-ink-soft">
              {product.singleSizeInfo ? (
                <>
                  <strong className="text-ink">{product.singleSizeInfo.label}:</strong> {product.singleSizeInfo.value}
                </>
              ) : (
                <>
                  <strong className="text-ink">{isSingleSize(product) ? 'Talla:' : 'Tallas:'}</strong>{' '}
                  {isSingleSize(product) ? 'única' : product.sizes.map((s) => s.label).join(' · ')}
                </>
              )}
            </p>

            <div>
              <PersonalizeLink className="btn-block" />
              <p className="mt-3 text-sm text-ink-soft">
                Diseña online y ve el precio final al momento. ¿Pides para un equipo o una empresa?{' '}
                <Link href="/empresas" className="font-bold text-violet-deep underline underline-offset-4">
                  Pide presupuesto
                </Link>
                .
              </p>
            </div>

            <ul className="grid gap-2.5">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-teal">
                    <Check aria-hidden="true" size={14} strokeWidth={4} />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Section id="precio" aria-labelledby="precio-titulo" tone="white" className="scroll-mt-20 border-y-2 border-ink">
        <SectionHeading id="precio-titulo" eyebrow="Precio" title="Cómo se calcula el precio">
          Sin letra pequeña: pagas el producto, el estampado de cada zona y, si pides varias unidades, tienes descuento.
        </SectionHeading>
        <ProductPricing product={product} />
      </Section>

      <Section aria-labelledby="zonas-titulo" tone="pink">
        <SectionHeading id="zonas-titulo" eyebrow="Estampado" title="Zonas de estampado">
          Estos son los sitios donde puedes imprimir tu diseño y el tamaño máximo de cada uno, dibujados a escala.
        </SectionHeading>
        <PrintZones product={product} />
      </Section>

      <Section aria-labelledby="ficha-titulo" tone="cream" className="border-y-2 border-ink">
        <SectionHeading id="ficha-titulo" eyebrow="Detalles" title="Ficha técnica y cuidados" />
        <ProductDetails product={product} />
      </Section>

      <Section aria-labelledby="envio-titulo" tone="yellow">
        <SectionHeading id="envio-titulo" eyebrow="Plazos y envío" title="Cuándo lo recibes" />
        <ShippingSummary />
      </Section>

      <Section aria-labelledby="faq-titulo" tone="white" className="border-y-2 border-ink">
        <SectionHeading id="faq-titulo" eyebrow="Dudas" title={`Preguntas sobre ${product.namePlural.toLowerCase()}`}>
          ¿No ves la tuya?{' '}
          <Link href="/preguntas-frecuentes" className="font-bold text-violet-deep underline underline-offset-4">
            Mira las preguntas frecuentes
          </Link>{' '}
          o{' '}
          <Link href="/contacto" className="font-bold text-violet-deep underline underline-offset-4">
            escríbenos
          </Link>
          .
        </SectionHeading>
        <div className="max-w-3xl">
          <ProductFaq faqs={faqs} />
        </div>
      </Section>

      <section aria-labelledby="cta-producto" className="bg-dots-soft border-b-2 border-ink bg-pink py-14 text-center sm:py-20">
        <div className="container-pop">
          <h2 id="cta-producto" className="text-3xl sm:text-5xl">
            ¿Listo para crear tu {product.name.toLowerCase()}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-bold">Elige tu color, sube tu diseño y comprueba cómo queda antes de pedir.</p>
          <PersonalizeLink className="btn-dark mt-7" />
        </div>
      </section>

      <Section aria-labelledby="mas-titulo" tone="cream">
        <SectionHeading id="mas-titulo" eyebrow="Más ideas" title="Otros productos para personalizar" />
        <RelatedProducts current={product} />
      </Section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: title,
          description: product.description,
          image: [`${site.url}${productImagePath(product.slug)}`],
          sku: product.id,
          category: CATEGORY_LABELS[product.category],
          url,
          brand: { '@type': 'Brand', name: site.name },
          // El precio real depende del diseño (zonas, tamaño del estampado, color y unidades): se publica como "desde".
          offers: {
            '@type': 'AggregateOffer',
            url,
            priceCurrency: site.currency,
            lowPrice: (fromCents / 100).toFixed(2),
            offerCount: product.colors.length,
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: site.name },
            // Productos personalizados: sin desistimiento (art. 103.c TRLGDCU); la garantía legal no es una política de devolución.
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              applicableCountry: site.country,
              returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
            },
          },
        }}
      />
    </ProductSelectionProvider>
  )
}
