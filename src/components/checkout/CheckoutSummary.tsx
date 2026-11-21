'use client'
import { useCatalog } from '@/components/catalog/CatalogProvider'
import { LineThumb } from '@/components/cart/LineThumb'
import { lineTitle, primaryPreviewId } from '@/components/cart/line-utils'
import type { PricedLine } from '@/components/cart/lines'
import { formatEUR, unidades } from '@/lib/format'
import type { CartTotals } from '@/lib/pricing'

/** Resumen del pedido durante el pago. El envío definitivo depende del código postal. */
export function CheckoutSummary({
  priced,
  totals,
  postalCodeKnown,
}: {
  priced: PricedLine[]
  totals: CartTotals
  postalCodeKnown: boolean
}) {
  // Plazos y transportista efectivos (editables en el panel).
  const { production, shipping: rules } = useCatalog()
  const shipping = totals.shippingCents
  return (
    <aside aria-labelledby="resumen-pedido" className="card bg-yellow-soft p-5 sm:p-6 lg:sticky lg:top-6">
      <h2 id="resumen-pedido" className="text-2xl">
        Tu pedido
      </h2>
      <ul className="mt-4 space-y-3">
        {priced.map((p) => (
          <li key={p.line.id} className="flex items-center gap-3">
            <LineThumb fileId={primaryPreviewId(p.line)} alt="" size={112} className="h-14 w-14 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{lineTitle(p)}</p>
              <p className="text-sm text-ink-soft">{unidades(p.units)}</p>
            </div>
            <p className="shrink-0 font-bold">{p.price ? formatEUR(p.price.totalCents) : '—'}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t-2 border-ink pt-4">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-bold">{formatEUR(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Envío{postalCodeKnown ? '' : ' (estimado)'}</dt>
          <dd className="font-bold">{shipping === null ? '—' : shipping === 0 ? 'Gratis' : formatEUR(shipping)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t-2 border-ink pt-3 text-xl">
          <dt className="font-display font-semibold">Total</dt>
          <dd className="font-display font-semibold">{formatEUR(totals.totalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-sm text-ink-soft">
          <dt>IVA incluido</dt>
          <dd>{formatEUR(totals.vatCents)}</dd>
        </div>
      </dl>
      {totals.freeShippingRemainingCents > 0 && shipping !== null && (
        <p className="mt-3 text-sm text-ink-soft">
          Te faltan {formatEUR(totals.freeShippingRemainingCents)} para el envío gratis.
        </p>
      )}
      <p className="mt-3 text-sm text-ink-soft">
        Producción de {production.leadDaysMin} a {production.leadDaysMax} días laborables y después envío por {rules.carrierLabel}.
      </p>
    </aside>
  )
}
