import type { MetadataRoute } from 'next'
import { PRODUCTS } from '@/config/products'
import { site } from '@/config/site'

type Entry = MetadataRoute.Sitemap[number]
type Route = { path: string; changeFrequency: Entry['changeFrequency']; priority: number }

const STATIC_ROUTES: Route[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/productos', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/personalizar', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/empresas', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/como-funciona', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/preguntas-frecuentes', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contacto', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/legal/aviso-legal', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/privacidad', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/cookies', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/condiciones', changeFrequency: 'yearly', priority: 0.2 },
]

/** Solo páginas públicas e indexables: el carrito, el pago, los pedidos y el panel quedan fuera. */
export default function sitemap(): MetadataRoute.Sitemap {
  const productRoutes: Route[] = PRODUCTS.map((p) => ({
    path: `/productos/${p.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))
  return [...STATIC_ROUTES, ...productRoutes].map(({ path, changeFrequency, priority }) => ({
    url: `${site.url}${path}`,
    changeFrequency,
    priority,
  }))
}
