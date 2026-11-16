import { Truck } from 'lucide-react'
import Link from 'next/link'
import { site } from '@/config/site'
import { computeCartTotals } from '@/lib/pricing'
import { formatEUR, unidades } from '@/lib/format'
import { ButtonLink } from '@/components/ui/Button'

/** Resumen del carrito: subtotal, envío estimado, total y progreso hacia el envío gratis. */
export function CartSummary({
  lineTotals,
  units,
  blocked,
}: {
  lineTotals: number[]
  units: number
  /** true si alguna línea tiene un problema que impide tramitar el pedido. */
  blocked: boolean
}) {
  const totals = computeCartTotals(lineTotals)
  const shipping = totals.shippingCents ?? 0
  const free = site.shipping.freeFromCents
  const pct = Math.min(100, Math.round((totals.subtotalCents / free) * 100))

  return (
    <aside aria-labelledby="resumen-titulo" className="card bg-yellow-soft p-5 sm:p-6 lg:sticky lg:top-6">
      <h2 id="resumen-titulo" className="text-2xl">
        Resumen
      </h2>
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Subtotal · {unidades(units)}</dt>
          <dd className="font-bold">{formatEUR(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Envío (estimado)</dt>
          <dd className="font-bold">{shipping === 0 ? 'Gratis' : formatEUR(shipping)}</dd>
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

      <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Truck size={18} aria-hidden="true" />
          {totals.freeShippingRemainingCents > 0
            ? `Te faltan ${formatEUR(totals.freeShippingRemainingCents)} para el envío gratis`
            : '¡Tienes el envío gratis!'}
        </p>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-cream"
          role="progressbar"
          aria-label={`Progreso hacia el envío gratis desde ${formatEUR(free, { compact: true })}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-5">
        {blocked ? (
          <>
            <button type="button" className="btn btn-primary btn-lg btn-block" aria-disabled="true" aria-describedby="resumen-bloqueado" onClick={(e) => e.preventDefault()}>
              Tramitar pedido
            </button>
            <p id="resumen-bloqueado" className="mt-2 text-sm font-bold text-danger">
              Soluciona las líneas marcadas en rojo para poder continuar.
            </p>
          </>
        ) : (
          <ButtonLink href="/checkout" variant="primary" size="lg" block>
            Tramitar pedido
          </ButtonLink>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        Envío a la península y Baleares (+{formatEUR(site.shipping.balearesExtraCents)}). El coste exacto se calcula con tu código
        postal. Producción de {site.production.leadDaysMin} a {site.production.leadDaysMax} días laborables.
      </p>

      {units >= site.b2b.quoteFromUnits && (
        <p className="mt-4 rounded-2xl border-2 border-ink bg-violet-soft p-3 text-sm">
          <strong>¿Pedido grande?</strong> Con {site.b2b.quoteFromUnits} unidades o más podemos ofrecerte precio por volumen a
          medida.{' '}
          <Link href="/empresas" className="font-bold text-violet-deep underline">
            Pide presupuesto para empresas
          </Link>
          .
        </p>
      )}
    </aside>
  )
}
