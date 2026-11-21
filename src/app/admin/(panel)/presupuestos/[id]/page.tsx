import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Building2, CalendarClock, Mail, MessageCircle, Package, Paperclip, Phone, Download, Shirt } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Panel } from '@/components/admin/Panel'
import { ProposalEditor } from '@/components/admin/ProposalEditor'
import { QuoteForm } from '@/components/admin/QuoteForm'
import { OrderStatusBadge, QuoteStatusBadge } from '@/components/admin/StatusBadges'
import { FileImage } from '@/components/admin/Thumb'
import { Badge } from '@/components/ui/Badge'
import { site } from '@/config/site'
import { getProduct } from '@/config/products'
import { proposalPagePath } from '@/lib/emails/quote'
import { getFileMetas } from '@/lib/files'
import { formatEUR } from '@/lib/format'
import { isValidId } from '@/lib/ids'
import { isLiveQuoteOrder, loadQuoteOrder } from '@/lib/quote-accept'
import { getCatalog } from '@/lib/settings'
import { adminDateTime, formatDeadline, timeAgo } from '@/lib/admin/dates'
import { firstName, mailtoHref, telHref, whatsappHref } from '@/lib/admin/contact'
import { loadQuote } from '@/lib/admin/queries'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const quote = isValidId(id) ? await loadQuote(id) : null
  return { title: quote ? quote.number : 'Presupuesto' }
}

const contactLink =
  'inline-flex min-h-11 items-center gap-2 [overflow-wrap:anywhere] font-bold text-violet-deep underline-offset-4 hover:underline'

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params
  if (!isValidId(id)) notFound()
  const quote = await loadQuote(id)
  if (!quote) notFound()

  const isQuote = quote.kind === 'quote'
  const [files, order, catalog] = await Promise.all([getFileMetas(quote.fileIds), loadQuoteOrder(quote), getCatalog()])
  // Con un pedido vivo la propuesta es inmutable; si ese pedido se canceló, se puede retocar y volver a aceptar.
  const locked = !!order && isLiveQuoteOrder(order)
  const publicUrl = quote.publicToken ? `${site.url}${proposalPagePath(quote)}` : null
  const editorProducts = catalog.products.map((p) => ({ id: p.id, name: p.name, sizes: p.sizes.map((s) => ({ id: s.id, label: s.label })) }))
  const tel = telHref(quote.phone)
  const wa = whatsappHref(quote.phone, `Hola ${firstName(quote.name)}, te escribimos de ${site.name} sobre tu ${isQuote ? 'solicitud de presupuesto' : 'mensaje'} (${quote.number}).`)
  const reply = mailtoHref(quote.email, {
    subject: isQuote
      ? `Tu solicitud de presupuesto (${quote.number}) — ${site.name}`
      : `Respuesta a tu mensaje (${quote.number}) — ${site.name}`,
    body: `Hola ${firstName(quote.name)},\n\nGracias por escribirnos.\n\n\n\nUn saludo,\n${site.name}`,
  })
  const productNames = quote.products.map((p) => getProduct(p)?.namePlural ?? (p === 'otro' ? 'Otro producto' : p))

  return (
    <>
      <PageHeader
        back={{
          href: isQuote ? '/admin/presupuestos' : '/admin/presupuestos?tipo=mensajes',
          label: isQuote ? 'Todos los presupuestos' : 'Todos los mensajes',
        }}
        title={`${isQuote ? 'Presupuesto' : 'Mensaje'} ${quote.number}`}
        badge={<QuoteStatusBadge status={quote.status} className="text-base" />}
        description={
          <>
            Recibido {timeAgo(quote.createdAt)} · {adminDateTime(quote.createdAt)}
          </>
        }
        actions={
          <a href={reply} className="btn btn-primary">
            <Mail size={18} aria-hidden="true" />
            Responder por email
          </a>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <Panel title={isQuote ? 'Qué necesita' : 'Mensaje'} id="mensaje">
            {isQuote && (
              <dl className="mb-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                    <Shirt size={14} aria-hidden="true" /> Productos
                  </dt>
                  <dd className="mt-0.5 font-bold">{productNames.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Unidades aprox.</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{quote.quantity ?? '—'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                    <CalendarClock size={14} aria-hidden="true" /> Fecha límite
                  </dt>
                  <dd className="mt-0.5 font-bold">{formatDeadline(quote.deadline)}</dd>
                </div>
              </dl>
            )}
            <p className="whitespace-pre-wrap break-words rounded-xl border-2 border-ink/15 bg-cream/60 p-3.5">{quote.message}</p>
          </Panel>

          {isQuote && (
            <ProposalEditor
              quoteId={quote.id}
              customerEmail={quote.email}
              initial={quote.proposal}
              locked={locked}
              publicUrl={publicUrl}
              products={editorProducts}
              suggestedProductIds={quote.products}
            />
          )}

          {files.length > 0 && (
            <Panel title="Archivos adjuntos" id="adjuntos" icon={<Paperclip size={20} />}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {files.map((f, i) => (
                  <li key={f.id} className="overflow-hidden rounded-xl border-2 border-ink bg-white">
                    <a href={`/api/files/${f.id}`} target="_blank" rel="noopener" className="block h-40 bg-cream/60 p-2">
                      <FileImage
                        fileId={f.id}
                        alt={`Adjunto: ${f.name ?? 'archivo sin nombre'}`}
                        width={320}
                        height={160}
                        fit="box"
                        checker
                        eager={i === 0}
                      />
                      <span className="sr-only">Abrir a tamaño completo (pestaña nueva)</span>
                    </a>
                    <div className="flex items-center justify-between gap-2 border-t-2 border-ink px-3 py-2">
                      <p className="min-w-0 truncate text-sm font-bold">{f.name ?? 'Archivo sin nombre'}</p>
                      <a
                        href={`/api/files/${f.id}?download=1`}
                        download
                        className="btn btn-sm btn-teal shrink-0"
                        aria-label={`Descargar ${f.name ?? 'archivo'}`}
                      >
                        <Download size={16} aria-hidden="true" />
                        Descargar
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          {order && (
            <Panel title="Pedido" id="pedido" icon={<Package size={20} />} tone={locked ? 'teal' : 'white'}>
              <p className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/pedidos/${order.id}`} className="font-display text-xl font-semibold text-violet-deep underline decoration-pink decoration-2 underline-offset-4">
                  Pedido {order.number}
                </Link>
                <OrderStatusBadge status={order.status} />
              </p>
              <dl className="mt-3 divide-y-2 divide-ink/10 text-[0.95rem]">
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-ink-soft">Pago</dt>
                  <dd>
                    <Badge tone={order.payment.status === 'captured' ? 'success' : order.payment.status === 'failed' ? 'danger' : 'warning'}>
                      {order.payment.status === 'captured' ? 'Cobrado' : order.payment.status === 'failed' ? 'Fallido' : 'Sin cobrar'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-ink-soft">Total</dt>
                  <dd className="font-bold tabular-nums">{formatEUR(order.totalCents)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-ink-soft">{order.payment.paidAt ? 'Pagado el' : 'Creado el'}</dt>
                  <dd className="font-bold">{adminDateTime(order.payment.paidAt ?? order.createdAt)}</dd>
                </div>
              </dl>
              {!locked && (
                <p className="mt-3 text-sm text-ink-soft">
                  Ese pedido está cancelado: la propuesta se puede modificar y el cliente volver a aceptarla desde el mismo enlace.
                </p>
              )}
            </Panel>
          )}
          <Panel title="Contacto" id="contacto" icon={<Building2 size={20} />}>
            <p className="text-lg font-extrabold">{quote.name}</p>
            {quote.company && <p className="text-ink-soft">{quote.company}</p>}
            <ul className="mt-2">
              <li>
                <a href={reply} className={contactLink}>
                  <Mail size={18} aria-hidden="true" className="shrink-0" />
                  {quote.email}
                </a>
              </li>
              {quote.phone && (
                <li>
                  {tel ? (
                    <a href={tel} className={contactLink}>
                      <Phone size={18} aria-hidden="true" className="shrink-0" />
                      {quote.phone}
                    </a>
                  ) : (
                    <span className="inline-flex min-h-11 items-center gap-2">
                      <Phone size={18} aria-hidden="true" className="shrink-0" />
                      {quote.phone}
                    </span>
                  )}
                </li>
              )}
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={contactLink}>
                    <MessageCircle size={18} aria-hidden="true" className="shrink-0" />
                    Escribir por WhatsApp
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                </li>
              )}
            </ul>
          </Panel>
          <QuoteForm quoteId={quote.id} kind={quote.kind} status={quote.status} adminNote={quote.adminNote} />
        </div>
      </div>
    </>
  )
}
