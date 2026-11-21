import { PRODUCTS, fromPriceCents } from '@/config/products'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'
import { renderOgImage } from '@/lib/og-image'
import { getCatalog } from '@/lib/settings'
import { catalogProductBySlug } from '@/lib/settings-schema'

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }))
}

/** Imagen para compartir la ficha de cada producto (1200 × 630): su nombre, su lema y el precio "desde" efectivo. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = catalogProductBySlug(await getCatalog(), slug)
  if (!product) return new Response('No encontrado', { status: 404 })
  return renderOgImage({
    kicker: `${site.name} · desde ${formatEUR(fromPriceCents(product))}`,
    title: product.namePlural,
    subtitle: product.tagline,
  })
}
