import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExternalLink, Inbox, Printer, TriangleAlert } from 'lucide-react'
import { Feedback } from '@/components/admin/Feedback'
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
import { getFileMetas, getPngSizes } from '@/lib/files'
import { unidades } from '@/lib/format'
import { isValidId } from '@/lib/ids'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/order-status'
import { orderFileIds } from '@/lib/orders'
import { adminDateTime } from '@/lib/admin/dates'
import { loadOrder, loadOrderQuoteSource } from '@/lib/admin/queries'

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
  const [metas, pngSizes, quote] = await Promise.all([
    getFileMetas(fileIds),
    getPngSizes(order.items.flatMap((i) => Object.values(i.printFiles))),
    loadOrderQuoteSource(order),
  ])
  const files = new Map(metas.map((f) => [f.id, f]))
  const units = order.items.reduce((n, i) => n + i.quantity, 0)
  const showTracking = order.status === 'shipped' || order.status === 'delivered'

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

      {order.quoteId && (
        <Panel title={`Procede del presupuesto ${quote?.number ?? order.quoteNumber ?? ''}`} tone="violet" icon={<Inbox size={20} />} className="mb-6" id="origen">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl">
              El cliente aceptó la propuesta de precio y creó este pedido desde su enlace. Lo que se fabrica es lo acordado en la
              propuesta; los archivos que adjuntó están en el presupuesto, no en el pedido.
            </p>
            {quote ? (
              <ButtonLink href={`/admin/presupuestos/${quote.id}`} variant="secondary" size="sm">
                Ver presupuesto {quote.number}
              </ButtonLink>
            ) : (
              <p className="text-sm font-bold text-ink-soft">El presupuesto ya no existe.</p>
            )}
          </div>
        </Panel>
      )}

      {order.customerNote && (
        <Panel title="Nota del cliente al pedido" tone="yellow" icon={<TriangleAlert size={20} />} className="mb-6">
          <p className="whitespace-pre-wrap break-words">{order.customerNote}</p>
        </Panel>
      )}

      {/*
        Escritorio: artículos a la izquierda y gestión a la derecha. Móvil: una sola columna con el orden de trabajo
        (estado, contacto, artículos, pago, nota, historial); `contents` deja los bloques como hijos directos de la rejilla.
      */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 max-lg:contents lg:col-start-1 lg:row-start-1 lg:space-y-6">
          <section aria-labelledby="articulos-title" className="space-y-4 max-lg:order-4">
            <h2 id="articulos-title" className="text-2xl">
              Artículos <span className="font-body text-lg text-ink-soft">({order.items.length})</span>
            </h2>
            {order.items.map((item, i) => (
              <OrderItemCard key={item.lineId} item={item} index={i} files={files} pngSizes={pngSizes} quote={quote} />
            ))}
          </section>
          <div className="max-lg:order-7">
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
            <NoteForm endpoint={`/api/admin/orders/${order.id}/note`} field="note" initial={order.adminNote ?? ''} />
          </div>
        </div>
      </div>
    </>
  )
}
