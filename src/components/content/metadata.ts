import type { Metadata } from 'next'
import { site } from '@/config/site'

/** Metadatos comunes de las páginas informativas: título, descripción, canonical y Open Graph en es-ES. */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      url: path,
    },
  }
}
