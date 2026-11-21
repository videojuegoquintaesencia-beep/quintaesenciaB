import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExternalLink, FileText, Printer, TriangleAlert } from 'lucide-react'
import { Feedback } from '@/components/admin/Feedback'
import { InvoicePanel } from '@/components/admin/InvoicePanel'
import { NoteForm } from '@/components/admin/NoteForm'
import { OrderEvents } from '@/components/admin/OrderEvents'
import { OrderItemCard } from '@/components/admin/OrderItemCard'
import { CustomerPanel, ShippingPanel } from '@/components/admin/OrderCustomerPanels'
import { PaymentPanel } from '@/components/admin/OrderPaymentPanel'
import { OrderStatusPanel } from '@/components/admin/OrderStatusPanel'
import { PageHeader } from '@/components/admin/PageHeader'
import { Panel } from '@/components/admin/Panel'
import { OrderStatusBadge } from '@/components/admin/StatusBadges'
import { TrackingForm } from '@/components/admin/TrackingForm'
import { ButtonLink } from '@/components/ui/Button'
import { invoiceUrl } from '@/lib/emails/order'
import { getFileMetas, getPngSizes } from '@/lib/files'
import { unidades } from '@/lib/format'
import { isValidId } from '@/lib/ids'
import { getInvoiceRecord } from '@/lib/invoices'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/order-status'
import { orderFileIds } from '@/lib/orders'
import { adminDateTime } from '@/lib/admin/dates'
import { loadOrder } from '@/lib/admin/queries'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const order = isValidId(id) ? await loadOrder(id) : null
  return { title: order ? `Pedido ${order.number}` : 'Pedido' }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  if (!isValidId(id)) notFound()
  const order = await loadOrder(id)
  if (!order) notFound()

  const fileIds = orderFileIds(order)
  const [files, pngSizes, invoice] = await Promise.all([
    getFileMetas(fileIds).then((metas) => new Map(metas.map((f) => [f.id, f]))),
    getPngSizes(order.items.flatMap((i) => Object.values(i.printFiles))),
    getInvoiceRecord(order.id),
  ])
  const units = order.items.reduce((n, i) => n + i.quantity, 0)
  const showTracking = order.status === 'shipped' || order.status === 'delivered'
  const latestInvoice = invoice?.rectification ?? invoice?.invoice ?? null

  return (
    <>
      <PageHeader
        back={{ href: '/admin/pedidos', label: 'Todos los pedidos' }}
        title={`Pedido ${order.number}`}
        badge={<OrderStatusBadge status={order.status} className="text-base" />}
        description={
          <>
            Creado el {adminDateTime(order.createdAt)}
            {order.payment.paidAt && <> · Pagado el {adminDateTime(order.payment.paidAt)}</>} · {unidades(units)}
          </>
        }
        actions={
          <>
            <ButtonLink href={`/admin/pedidos/${order.id}/produccion`} variant="secondary">
              <Printer size={18} aria-hidden="true" />
              Hoja de producción
            </ButtonLink>
            {latestInvoice && (
              <ButtonLink
                href={`/admin/pedidos/${order.id}/factura${latestInvoice.kind === 'rectification' ? '?doc=rectificativa' : ''}`}
                variant="plain"
              >
                <FileText size={18} aria-hidden="true" />
                {latestInvoice.kind === 'rectification' ? 'Rectificativa' : 'Factura'} {latestInvoice.number}
              </ButtonLink>
            )}
            <a
              href={`/pedido/${order.id}?t=${order.publicToken}`}
              target="_blank"
              rel="noopener"
              className="btn"
            >
              <ExternalLink size={18} aria-hidden="true" />
              Ver como cliente
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </>
        }
      />

      {order.status === 'pending_payment' && (
        <Feedback kind="warning" className="mb-6">
          <strong>Este pedido todavía no está pagado.</strong> No lo pases a producción hasta que se cobre; si el cliente
          abandonó el pago, se queda así.
        </Feedback>
      )}

      {order.customerNote && (
        <Panel title="Nota del cliente al pedido" tone="yellow" icon={<TriangleAlert size={20} />} className="mb-6">
          <p className="whitespace-pre-wrap break-words">{order.customerNote}</p>
        </Panel>
      )}

      {/*
        Escritorio: artículos a la izquierda y gestión a la derecha. Móvil: una sola columna con el orden de trabajo
        (estado, contacto, artículos, pago, factura, nota, historial); `contents` deja los bloques como hijos directos de la rejilla.
      */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 max-lg:contents lg:col-start-1 lg:row-start-1 lg:space-y-6">
          <section aria-labelledby="articulos-title" className="space-y-4 max-lg:order-4">
            <h2 id="articulos-title" className="text-2xl">
              Artículos <span className="font-body text-lg text-ink-soft">({order.items.length})</span>
            </h2>
            {order.items.map((item, i) => (
              <OrderItemCard key={item.lineId} item={item} index={i} files={files} pngSizes={pngSizes} />
            ))}
          </section>
          <div className="max-lg:order-8">
            <OrderEvents events={order.events} />
          </div>
        </div>

        <div className="min-w-0 max-lg:contents lg:col-start-2 lg:row-start-1 lg:space-y-6">
          <div className="space-y-6 max-lg:order-1">
            <OrderStatusPanel
              orderId={order.id}
              status={order.status}
              transitions={ORDER_STATUS_TRANSITIONS[order.status]}
              carrier={order.carrier}
              trackingCode={order.trackingCode}
              customerEmail={order.email}
            />
            {showTracking && <TrackingForm orderId={order.id} carrier={order.carrier} trackingCode={order.trackingCode} />}
          </div>
          <div className="max-lg:order-2">
            <CustomerPanel order={order} />
          </div>
          <div className="max-lg:order-3">
            <ShippingPanel order={order} />
          </div>
          <div className="max-lg:order-5">
            <PaymentPanel order={order} />
          </div>
          <div className="max-lg:order-6">
            <InvoicePanel
              orderId={order.id}
              status={order.status}
              customerEmail={order.email}
              customerUrl={invoice ? invoiceUrl(order, latestInvoice?.kind) : null}
              invoice={invoice ? { number: invoice.invoice.number, issuedAt: invoice.invoice.issuedAt } : null}
              rectification={invoice?.rectification ? { number: invoice.rectification.number, issuedAt: invoice.rectification.issuedAt } : null}
              demo={order.payment.provider === 'demo'}
            />
          </div>
          <div className="max-lg:order-7">
            <NoteForm endpoint={`/api/admin/orders/${order.id}/note`} field="note" initial={order.adminNote ?? ''} />
          </div>
        </div>
      </div>
    </>
  )
}
