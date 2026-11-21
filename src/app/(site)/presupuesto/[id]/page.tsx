import { CalendarClock, CircleCheck, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'
import { ProposalAcceptClient } from '@/components/quotes/ProposalAcceptClient'
import { ProposalSummary } from '@/components/quotes/ProposalSummary'
import { ButtonLink } from '@/components/ui/Button'
import { site } from '@/config/site'
import { orderPagePath } from '@/lib/checkout'
import { isValidId } from '@/lib/ids'
import { paymentMode } from '@/lib/paypal'
import { formatValidUntil, isProposalExpired } from '@/lib/proposal'
import { isLiveQuoteOrder, loadQuoteOrder } from '@/lib/quote-accept'
import { getQuoteByToken, type Quote } from '@/lib/quotes'
import { getSettings } from '@/lib/settings'
import { mailtoHref } from '@/lib/admin/contact'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string | string[] }>
}

/** Busca el presupuesto una sola vez por petición (lo comparten generateMetadata y la página). */
const loadQuote = cache(async (id: string, token: string | string[] | undefined): Promise<Quote | null> => {
  if (!isValidId(id) || typeof token !== 'string' || !/^[a-z0-9]{20,40}$/.test(token)) return null
  return getQuoteByToken(id, token)
})

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ id }, { t }] = await Promise.all([params, searchParams])
  const quote = await loadQuote(id, t)
  return {
    // Con un enlace inválido la página responde 404: la pestaña también lo dice.
    title: quote ? `Tu presupuesto ${quote.number}` : 'Página no encontrada',
    robots: { index: false, follow: false },
    // El enlace lleva un token secreto: que no viaje en la cabecera Referer a otras webs.
    referrer: 'no-referrer',
  }
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

export default async function ProposalPage({ params, searchParams }: PageProps) {
  const [{ id }, { t }] = await Promise.all([params, searchParams])
  const quote = await loadQuote(id, t)
  const proposal = quote?.proposal
  if (!quote || !proposal || typeof t !== 'string') notFound()

  // El modo de pago depende del entorno en tiempo de ejecución, no del build.
  await connection()
  const [order, settings] = await Promise.all([loadQuoteOrder(quote), getSettings()])
  const live = order && isLiveQuoteOrder(order) ? order : null
  const paid = live ? live.status !== 'pending_payment' : false
  const expired = !live && isProposalExpired(proposal)
  const contactEmail = settings.contact.email || site.contact.email
  const updateHref = mailtoHref(contactEmail, {
    subject: `Actualización del presupuesto ${quote.number}`,
    body: `Hola,\n\nLa propuesta del presupuesto ${quote.number} ha caducado. ¿Podéis enviarme una actualizada?\n\nGracias,\n${quote.name}`,
  })

  return (
    <div className="container-pop py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="sticker mb-4 inline-flex items-center gap-2 text-sm">Propuesta de presupuesto</p>
        <h1 className="text-4xl sm:text-5xl">Tu presupuesto {quote.number}</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Hola {firstName(quote.name)}, esta es nuestra propuesta para tu solicitud{quote.company ? ` de ${quote.company}` : ''}. Revísala
          y, si te encaja, acéptala y págala aquí mismo: en cuanto recibamos el pago nos ponemos con tu pedido.
        </p>
        {proposal.message && (
          <div className="card mt-5 bg-yellow-soft p-5">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Mensaje de {site.name}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{proposal.message}</p>
          </div>
        )}
      </header>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <aside aria-labelledby="propuesta-resumen" className="card bg-paper p-5 sm:p-6 lg:order-2 lg:sticky lg:top-6">
          <h2 id="propuesta-resumen" className="text-2xl">
            La propuesta
          </h2>
          <ProposalSummary proposal={proposal} className="mt-4" />
          {proposal.validUntil && (
            <p className={`mt-4 flex items-start gap-2 text-sm font-bold ${expired ? 'text-danger' : 'text-ink-soft'}`}>
              <CalendarClock size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{expired ? `Caducó el ${formatValidUntil(proposal.validUntil)}.` : `Válida hasta el ${formatValidUntil(proposal.validUntil)}.`}</span>
            </p>
          )}
        </aside>

        <div className="space-y-6 lg:order-1">
          {paid && live ? (
            <section className="card bg-teal-soft p-6 sm:p-8" aria-labelledby="propuesta-pagada">
              <p className="sticker mb-4 inline-flex items-center gap-2 text-sm">
                <CircleCheck size={18} aria-hidden="true" /> Aceptada y pagada
              </p>
              <h2 id="propuesta-pagada" className="text-3xl">
                Ya aceptaste esta propuesta
              </h2>
              <p className="mt-3">
                Tu pedido <strong>{live.number}</strong> está en marcha. Puedes seguir su estado desde su página; también te avisamos por
                email de cada cambio.
              </p>
              <ButtonLink href={orderPagePath(live)} className="mt-5">
                Ver mi pedido {live.number}
              </ButtonLink>
            </section>
          ) : expired ? (
            <section className="card bg-danger-soft p-6 sm:p-8" aria-labelledby="propuesta-caducada">
              <h2 id="propuesta-caducada" className="text-3xl">
                Esta propuesta ha caducado
              </h2>
              <p className="mt-3">
                Los precios tenían validez hasta el {formatValidUntil(proposal.validUntil ?? '')} y ya no se puede aceptar desde aquí. Si
                sigues interesado, pídenos una actualización y te enviamos una propuesta nueva en seguida.
              </p>
              <a href={updateHref} className="btn btn-primary mt-5">
                <Mail size={18} aria-hidden="true" />
                Pedir una actualización
              </a>
              <p className="mt-3 text-sm text-ink-soft">O escríbenos a {contactEmail} indicando la referencia {quote.number}.</p>
            </section>
          ) : (
            <ProposalAcceptClient
              quoteId={quote.id}
              token={t}
              mode={paymentMode()}
              paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ''}
              totalCents={proposal.totalCents}
              prefill={{ name: quote.name, email: quote.email, phone: quote.phone ?? '', company: quote.company ?? '' }}
              resume={live ? { orderNumber: live.number } : null}
              contactEmail={contactEmail}
            />
          )}
        </div>
      </div>
    </div>
  )
}
