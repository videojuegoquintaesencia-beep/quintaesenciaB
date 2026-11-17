import { site } from '@/config/site'

/** Imagen para compartir en redes: se genera en `app/opengraph-image.tsx` (ver `lib/og-image.tsx`). */
export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_ALT = `${site.name}: ropa, gorras y tazas con tu diseño`

/**
 * Las páginas que definen su propio `openGraph` sustituyen al del layout y pierden la imagen del archivo
 * `opengraph-image`: deben incluir esta lista en `openGraph.images`.
 */
/** Imagen para compartir de la ficha de un producto (la genera `app/og/[slug]/route.tsx`). */
export const productImagePath = (slug: string) => `/og/${slug}`

export const OG_IMAGES = [{ url: '/opengraph-image', ...OG_SIZE, alt: OG_ALT }]
