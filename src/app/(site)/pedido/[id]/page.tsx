import { ExternalLink, FileText, PartyPopper } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { OrderAutoRefresh } from '@/components/checkout/OrderAutoRefresh'
import { OrderItems } from '@/components/checkout/OrderItems'
import { OrderTimeline } from '@/components/checkout/OrderTimeline'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { site } from '@/config/site'
import { trackingUrlFor } from '@/lib/carriers'
import { formatDate, formatDateTime } from '@/lib/format'
import { isValidId } from '@/lib/ids'
import { getInvoiceRecord } from '@/lib/invoices'
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/order-status'
import { getOrderByToken, type Order } from '@/lib/orders'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string | string[] }>
}

/** Busca el pedido una sola vez por petición: lo comparten generateMetadata y la página. */
const loadOrder = cache(async (id: string, token: string | string[] | undefined): Promise<Order | null> => {
  if (!isValidId(id) || typeof token !== 'string' || token.length < 10) return null
  return getOrderByToken(id, token)
})

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ id }, { t }] = await Promise.all([params, searchParams])
  const order = await loadOrder(id, t)
  return {
    // Con un enlace inválido la página responde 404: la pestaña también lo dice.
    title: order ? 'Tu pedido' : 'Página no encontrada',
    robots: { index: false, follow: false },
    // El enlace lleva un token secreto: que no viaje en la cabecera Referer a otras webs.
    referrer: 'no-referrer',
  }
}

/** Se considera "recién pagado" durante las 3 horas siguientes al pago. */
const JUST_PAID_MS = 3 * 3600_000

function justPaid(order: Order): boolean {
  return order.status === 'paid' && !!order.payment.paidAt && Date.now() - new Date(order.payment.paidAt).getTime() < JUST_PAID_MS
}

export default async function OrderPage({ params, searchParams }: PageProps) {
  const [{ id }, { t }] = await Promise.all([params, searchParams])
  const order = await loadOrder(id, t)
  if (!order) notFound()

  const thanks = justPaid(order)
  const pending = order.status === 'pending_payment'
  const a = order.shipping
  const trackingUrl = trackingUrlFor(order.carrier, order.trackingCode)
  const invoice = pending ? null : await getInvoiceRecord(order.id)
  const invoiceHref = (doc: 'invoice' | 'rectification') =>
    `/pedido/${order.id}/factura?t=${order.publicToken}${doc === 'rectification' ? '&doc=rectificativa' : ''}`

  return (
    <div className="container-pop py-10 sm:py-14">
      {pending && <OrderAutoRefresh />}

      <header className={thanks ? 'card bg-teal-soft p-6 sm:p-8' : 'pb-2'}>
        {thanks && (
          <p className="sticker mb-4 inline-flex items-center gap-2 text-sm">
            <PartyPopper size={18} aria-hidden="true" /> Pago recibido
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl">
          {thanks ? `¡Gracias, ${order.customerName.trim().split(/\s+/)[0]}!` : `Pedido ${order.number}`}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-lg">
          {thanks && <span>Tu pedido <strong>{order.number}</strong> está confirmado.</span>}
          <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
        </p>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {thanks
            ? `Te hemos enviado la confirmación a ${order.email}. Producimos tu pedido en ${site.production.leadDaysMin} a ${site.production.leadDaysMax} días laborables y después sale por ${site.shipping.carrierLabel}.`
            : ORDER_STATUS_CUSTOMER_TEXT[order.status]}
        </p>
        {order.payment.provider === 'demo' && (
          <p className="mt-3 inline-block rounded-2xl border-2 border-ink bg-yellow-soft px-3 py-2 text-sm font-bold">
            Pedido de demostración: el pago ha sido simulado y no se ha cobrado nada.
          </p>
        )}
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="pedido-productos">
            <h2 id="pedido-productos" className="mb-4 text-2xl">
              Tu pedido
            </h2>
            <OrderItems order={order} />
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="pedido-envio">
            <h2 id="pedido-envio" className="mb-3 text-2xl">
              Envío
            </h2>
            <address className="not-italic leading-relaxed">
              <strong>{a.name}</strong>
              <br />
              {a.line1}
              {a.line2 ? (
                <>
                  <br />
                  {a.line2}
                </>
              ) : null}
              <br />
              {a.postalCode} {a.city} ({a.province})
            </address>
            {order.trackingCode ? (
              <div className="mt-4 rounded-2xl border-2 border-ink bg-teal-soft p-3">
                <p>
                  <strong>Seguimiento del envío:</strong> {order.carrier ?? 'Mensajería'} ·{' '}
                  <span className="font-mono">{order.trackingCode}</span>
                </p>
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm mt-3">
                    <ExternalLink size={16} aria-hidden="true" />
                    Seguir mi envío en {order.carrier}
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                Cuando enviemos tu pedido verás aquí el código de seguimiento y te avisaremos por email.
              </p>
            )}
            {(order.company || order.taxId) && (
              <p className="mt-4 text-sm text-ink-soft">
                Datos de facturación: {[order.company, order.taxId].filter(Boolean).join(' · ')}
              </p>
            )}
            {order.customerNote && <p className="mt-2 text-sm text-ink-soft">Tu nota: {order.customerNote}</p>}
          </section>

          {invoice && (
            <section className="card p-5 sm:p-6" aria-labelledby="pedido-factura">
              <h2 id="pedido-factura" className="mb-3 text-2xl">
                Factura
              </h2>
              <p>
                {invoice.rectification ? (
                  <>
                    La factura <strong>{invoice.invoice.number}</strong> quedó anulada por la factura rectificativa{' '}
                    <strong>{invoice.rectification.number}</strong> del {formatDate(invoice.rectification.issuedAt)}.
                  </>
                ) : (
                  <>
                    Factura <strong>{invoice.invoice.number}</strong>, emitida el {formatDate(invoice.invoice.issuedAt)}. Puedes verla,
                    imprimirla o guardarla en PDF.
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href={invoiceHref(invoice.rectification ? 'rectification' : 'invoice')} variant="secondary" size="sm">
                  <FileText size={16} aria-hidden="true" />
                  {invoice.rectification ? 'Descargar factura rectificativa' : 'Descargar factura'}
                </ButtonLink>
                {invoice.rectification && (
                  <ButtonLink href={invoiceHref('invoice')} variant="plain" size="sm">
                    Ver la factura anulada
                  </ButtonLink>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="pedido-estado">
            <h2 id="pedido-estado" className="mb-4 text-2xl">
              Estado del pedido
            </h2>
            <OrderTimeline order={order} />
            <p className="mt-4 text-xs text-ink-soft">
              Pedido realizado el {formatDateTime(order.createdAt)}
              {order.payment.paidAt ? ` · pagado el ${formatDateTime(order.payment.paidAt)}` : ''}
            </p>
          </section>

          <section className="card bg-yellow-soft p-5 sm:p-6" aria-labelledby="pedido-dudas">
            <h2 id="pedido-dudas" className="text-2xl">
              ¿Dudas?
            </h2>
            <p className="mt-2">
              Escríbenos indicando tu número de pedido <strong>{order.number}</strong> y te ayudamos.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/contacto" variant="primary" size="sm">
                Contactar
              </ButtonLink>
              <Link href="/preguntas-frecuentes" className="btn btn-sm">
                Preguntas frecuentes
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
