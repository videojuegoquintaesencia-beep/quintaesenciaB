import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Clock, Globe, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { ContactForm } from '@/components/content/ContactForm'
import { PageHero } from '@/components/content/PageHero'
import { pageMetadata } from '@/components/content/metadata'
import { socialHandle, socialHref, telHref, whatsappHref } from '@/components/content/contact-info'
import { site } from '@/config/site'
import { getCatalog, getSettings } from '@/lib/settings'

export const metadata: Metadata = pageMetadata({
  title: 'Contacto',
  description: `Escríbenos para resolver dudas sobre tu pedido, tu diseño o un envío fuera de la tienda online. ${site.name} te responde en 1-2 días laborables.`,
  path: '/contacto',
})

function ContactRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-yellow-soft">
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-bold text-ink-soft">{label}</p>
        <div className="font-bold [overflow-wrap:anywhere]">{children}</div>
      </div>
    </li>
  )
}

const linkClass = 'underline-offset-4 hover:underline'

export default async function ContactoPage() {
  // Datos de contacto y zonas sin envío efectivos (editables en el panel): los campos vacíos no se muestran.
  const [{ contact }, { shipping }] = await Promise.all([getSettings(), getCatalog()])
  const whatsapp = whatsappHref(contact.whatsapp)
  const hasOtherWays = Object.values(contact).some((v) => v !== '')
  return (
    <>
      <PageHero tone="yellow" crumbs={[{ label: 'Contacto' }]} eyebrow="Hablamos" title="Cuéntanos qué necesitas">
        Escríbenos para resolver dudas sobre tu diseño, tu pedido o un envío especial. Respondemos en 1-2 días laborables.
      </PageHero>

      <Section aria-labelledby="formulario-contacto">
        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
          <div>
            <h2 id="formulario-contacto" className="mb-5 text-3xl sm:text-4xl">Envíanos un mensaje</h2>
            <ContactForm contactEmail={contact.email} />
          </div>

          <aside aria-label="Datos de contacto" className="grid gap-6">
            {hasOtherWays && (
              <div className="card p-5 sm:p-6">
                <h2 className="text-2xl">Otras formas de contactar</h2>
                <ul className="mt-5 grid gap-5">
                  {contact.email && (
                    <ContactRow icon={Mail} label="Email">
                      <a href={`mailto:${contact.email}`} className={linkClass}>{contact.email}</a>
                    </ContactRow>
                  )}
                  {contact.phone && (
                    <ContactRow icon={Phone} label="Teléfono">
                      <a href={telHref(contact.phone)} className={linkClass}>{contact.phone}</a>
                    </ContactRow>
                  )}
                  {contact.instagram && (
                    <ContactRow icon={Globe} label="Instagram">
                      <a href={socialHref(contact.instagram, 'https://www.instagram.com/')} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {socialHandle(contact.instagram, 'instagram')}
                        <span className="sr-only"> (se abre en una pestaña nueva)</span>
                      </a>
                    </ContactRow>
                  )}
                  {contact.tiktok && (
                    <ContactRow icon={Globe} label="TikTok">
                      <a href={socialHref(contact.tiktok, 'https://www.tiktok.com/@')} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {socialHandle(contact.tiktok, 'tiktok')}
                        <span className="sr-only"> (se abre en una pestaña nueva)</span>
                      </a>
                    </ContactRow>
                  )}
                  {contact.address && (
                    <ContactRow icon={MapPin} label="Dirección">
                      <address className="not-italic">{contact.address}</address>
                    </ContactRow>
                  )}
                  {contact.hours && (
                    <ContactRow icon={Clock} label="Horario de atención">
                      {contact.hours}
                    </ContactRow>
                  )}
                </ul>
                {whatsapp && (
                  <div className="mt-6">
                    <ButtonLink href={whatsapp} variant="teal" block target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden="true" className="size-5" />
                      Escríbenos por WhatsApp
                      <span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </ButtonLink>
                  </div>
                )}
              </div>
            )}

            <div className="card bg-yellow-soft p-5 sm:p-6">
              <h2 className="text-xl">¿Vives en {shipping.excludedZonesLabel}, o fuera de España?</h2>
              <p className="mt-2 text-ink-soft">
                Desde la tienda online todavía no enviamos a esas zonas, pero escríbenos y lo vemos: cuéntanos qué necesitas y dónde
                lo quieres recibir.
              </p>
            </div>

            <p className="text-sm text-ink-soft">
              ¿Es una duda rápida? Quizá la resuelven las{' '}
              <Link href="/preguntas-frecuentes" className="font-bold text-violet-deep underline">preguntas frecuentes</Link>. Si ya hiciste un
              pedido, puedes ver su estado en{' '}
              <Link href="/seguimiento" className="font-bold text-violet-deep underline">seguimiento de pedido</Link>.
            </p>
          </aside>
        </div>
      </Section>
    </>
  )
}
