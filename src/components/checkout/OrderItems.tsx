import { FileText } from 'lucide-react'
import { site } from '@/config/site'
import { LineThumb } from '@/components/cart/LineThumb'
import { primaryPreviewId } from '@/components/cart/line-utils'
import { formatEUR, unidades } from '@/lib/format'
import { isQuoteItem, orderItemTitle, quoteLineNote } from '@/lib/order-items'
import type { Order, OrderItem } from '@/lib/orders'

function sizesLabel(item: OrderItem): string {
  return Object.entries(item.sizes)
    .filter(([, q]) => q > 0)
    .map(([size, q]) => (size === 'unica' ? unidades(q) : `${q} × ${size}`))
    .join(' · ')
}

/** Productos del pedido con su vista previa y desglose de totales (IVA incluido). */
export function OrderItems({ order }: { order: Order }) {
  return (
    <div>
      <ul className="divide-y-2 divide-ink/15">
        {order.items.map((it) => (
          <li key={it.lineId} className="flex gap-4 py-4 first:pt-0">
            {isQuoteItem(it) ? (
              // Las líneas de un presupuesto no tienen diseño del personalizador: no hay vista previa que enseñar.
              <span
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-yellow-soft"
              >
                <FileText size={28} />
              </span>
            ) : (
              <LineThumb
                fileId={primaryPreviewId(it)}
                alt={`Tu diseño: ${it.productName} ${it.colorName}`}
                size={160}
                className="h-20 w-20"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-extrabold [overflow-wrap:anywhere]">{orderItemTitle(it)}</p>
              {isQuoteItem(it) ? (
                <p className="text-sm text-ink-soft">
                  {quoteLineNote(order.quoteNumber)}
                  {it.productId !== 'otro' && ` · ${it.productName}`}
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink" style={{ background: it.colorHex }} />
                  {it.colorName}
                </p>
              )}
              <p className="mt-1 text-sm">
                {sizesLabel(it)}
                {isQuoteItem(it) && it.unitCents !== undefined && ` · ${formatEUR(it.unitCents)} por unidad`}
              </p>
              {it.discountCents > 0 && (
                <p className="text-sm text-ink-soft">
                  Descuento por cantidad ({it.discountPct}&nbsp;%): −{formatEUR(it.discountCents)}
                </p>
              )}
              {it.note && <p className="text-sm text-ink-soft">Tu nota: {it.note}</p>}
            </div>
            <p className="shrink-0 font-bold">{formatEUR(it.totalCents)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t-2 border-ink pt-4">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-bold">{formatEUR(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Envío</dt>
          <dd className="font-bold">{order.shippingCents === 0 ? 'Gratis' : formatEUR(order.shippingCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-xl">
          <dt className="font-display font-semibold">Total</dt>
          <dd className="font-display font-semibold">{formatEUR(order.totalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-sm text-ink-soft">
          <dt>IVA incluido ({Math.round(site.vatRate * 100)}&nbsp;%)</dt>
          <dd>{formatEUR(order.vatCents)}</dd>
        </div>
      </dl>
    </div>
  )
}
