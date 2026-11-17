'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'
import type { PaymentMode } from '@/lib/paypal'
import { DemoPayment } from './DemoPayment'
import type { PaymentBridge } from './payment-types'

const PayPalPayment = dynamic(() => import('./PayPalPayment'), {
  ssr: false,
  loading: () => (
    <div className="h-12 animate-pulse rounded-full border-2 border-ink bg-cream" role="status" aria-label="Cargando PayPal" />
  ),
})

export function PaymentSection({
  mode,
  paypalClientId,
  bridge,
  totalCents,
  shippingEstimated,
}: {
  mode: PaymentMode
  paypalClientId: string
  bridge: PaymentBridge
  /** Total del pedido con IVA (y envío, estimado si aún no hay código postal). */
  totalCents: number
  /** true mientras el envío es una estimación (falta un código postal válido). */
  shippingEstimated: boolean
}) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="sec-pago">
      <h2 id="sec-pago" className="flex items-center gap-3 text-2xl">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow font-display text-lg">
          4
        </span>
        Pago
      </h2>
      <div className="mt-5">
        {mode !== 'unavailable' && (
          // Art. 98.2 TRLGDCU: el consumidor debe saber, junto al botón, que el pedido implica una obligación de pago.
          <p id="obligacion-pago" className="mb-4 rounded-2xl border-2 border-ink bg-yellow-soft p-3 font-bold">
            Al pulsar el botón de pago realizas un pedido con obligación de pago de {formatEUR(totalCents)}{' '}
            {shippingEstimated ? '(IVA incluido; el envío se ajusta a tu código postal)' : '(IVA y envío incluidos)'}.
          </p>
        )}
        {mode === 'paypal' && (
          <>
            <p className="mb-4 text-sm text-ink-soft">
              Pagas de forma segura con PayPal, con tu cuenta o con tarjeta. Nosotros nunca vemos los datos de tu tarjeta.
            </p>
            <PayPalPayment clientId={paypalClientId} bridge={bridge} />
          </>
        )}
        {mode === 'demo' && <DemoPayment bridge={bridge} />}
        {mode === 'unavailable' && (
          <p className="rounded-2xl border-2 border-ink bg-danger-soft p-4 font-bold">
            El pago online no está disponible ahora mismo. Escríbenos desde la{' '}
            <Link href="/contacto" className="underline">
              página de contacto
            </Link>{' '}
            o a {site.contact.email} y cerramos tu pedido contigo.
          </p>
        )}
      </div>
    </section>
  )
}
