import type { Metadata } from 'next'
import { site } from '@/config/site'
import { BusinessStrip } from '@/components/home/BusinessStrip'
import { FinalCta } from '@/components/home/FinalCta'
import { Hero } from '@/components/home/Hero'
import { HowItWorks } from '@/components/home/HowItWorks'
import { Inspiration } from '@/components/home/Inspiration'
import { PersonalizerTeaser } from '@/components/home/PersonalizerTeaser'
import { ProductsSection } from '@/components/home/ProductsSection'
import { WhyDtf } from '@/components/home/WhyDtf'
import { contactLinks } from '@/components/site/contact-links'
import { JsonLd } from '@/components/site/JsonLd'
import { OG_IMAGES } from '@/lib/og-meta'
import { getSettings } from '@/lib/settings'
import type { ContactSettings } from '@/lib/settings-schema'

const title = `${site.name}: camisetas, sudaderas, gorras y tazas personalizadas`

export const metadata: Metadata = {
  title: { absolute: title },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: { title, description: site.description, url: '/', type: 'website', locale: 'es_ES', siteName: site.name, images: OG_IMAGES },
}

/** JSON-LD de la organización con los datos de contacto efectivos (los vacíos no se publican). */
function structuredData(contact: ContactSettings) {
  const links = contactLinks(contact)
  const sameAs = links.filter((l) => l.key === 'instagram' || l.key === 'tiktok').map((l) => l.href)
  const reach = {
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
  }
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organizacion`,
    name: site.name,
    url: site.url,
    logo: `${site.url}/icon.svg`,
    description: site.description,
    ...reach,
    areaServed: site.country,
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...reach,
      availableLanguage: 'es',
      areaServed: site.country,
    },
  }
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#web`,
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: site.locale,
    publisher: { '@id': `${site.url}/#organizacion` },
  }
  return { organization, website }
}

export default async function HomePage() {
  const { contact } = await getSettings()
  const { organization, website } = structuredData(contact)
  return (
    <>
      <Hero />
      <ProductsSection />
      <HowItWorks />
      <WhyDtf />
      <PersonalizerTeaser />
      <BusinessStrip />
      <Inspiration />
      <FinalCta />
      <JsonLd data={organization} />
      <JsonLd data={website} />
    </>
  )
}
