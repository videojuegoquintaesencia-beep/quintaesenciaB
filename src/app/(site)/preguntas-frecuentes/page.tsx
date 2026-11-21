import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { PageHero } from '@/components/content/PageHero'
import { pageMetadata } from '@/components/content/metadata'
import { whatsappHref } from '@/components/content/contact-info'
import { faqGroups, faqPlainText, type FaqGroup } from '@/lib/faq'
import { getCatalog, getSettings } from '@/lib/settings'

export const metadata: Metadata = pageMetadata({
  title: 'Preguntas frecuentes',
  description:
    'Plazos, envíos, archivos de diseño, cuidados, pagos y pedidos para empresas: respuestas claras a las dudas más habituales sobre tus productos personalizados.',
  path: '/preguntas-frecuentes',
})

const faqJsonLd = (groups: FaqGroup[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: 'es-ES',
  mainEntity: groups.flatMap((g) =>
    g.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: faqPlainText(item.answer) },
    })),
  ),
})

export default async function PreguntasFrecuentesPage() {
  const [{ contact }, catalog] = await Promise.all([getSettings(), getCatalog()])
  const whatsapp = whatsappHref(contact.whatsapp)
  // Las respuestas citan importes, plazos y zonas: siempre los efectivos (editables en el panel).
  const FAQ_GROUPS = faqGroups(catalog)
  return (
    <>
      <PageHero tone="violet" crumbs={[{ label: 'Preguntas frecuentes' }]} eyebrow="Dudas habituales" title="Preguntas frecuentes">
        Plazos, envíos, archivos, pagos y pedidos para empresas. Si no encuentras lo que buscas, escríbenos.
      </PageHero>

      <Section>
        <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Temas de preguntas frecuentes" className="lg:sticky lg:top-24">
            <p className="mb-3 hidden font-display text-lg font-semibold lg:block">Temas</p>
            <ul className="flex flex-wrap gap-2 lg:grid lg:gap-1.5">
              {FAQ_GROUPS.map((g) => (
                <li key={g.id}>
                  <a href={`#${g.id}`} className="chip min-h-11 bg-paper px-4 text-base hover:bg-yellow lg:flex lg:w-full lg:rounded-xl">
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-12">
            {FAQ_GROUPS.map((g) => (
              <section key={g.id} id={g.id} aria-labelledby={`${g.id}-titulo`} className="scroll-mt-24">
                <h2 id={`${g.id}-titulo`} className="mb-5 text-3xl">{g.title}</h2>
                <FaqList group={g} />
              </section>
            ))}

            <div className="card bg-teal-soft p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl">¿No encuentras tu respuesta?</h2>
              <p className="mt-2 text-lg text-ink-soft">Escríbenos y te contestamos en 1-2 días laborables.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href="/contacto">Escríbenos</ButtonLink>
                {whatsapp && (
                  <ButtonLink href={whatsapp} variant="secondary" target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" className="size-5" />
                    WhatsApp
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </ButtonLink>
                )}
              </div>
            </div>
          </div>
        </div>
      </Section>
      <JsonLd data={faqJsonLd(FAQ_GROUPS)} />
    </>
  )
}
