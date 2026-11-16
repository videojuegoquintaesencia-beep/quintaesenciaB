'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { site } from '@/config/site'
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
}: {
  mode: PaymentMode
  paypalClientId: string
  bridge: PaymentBridge
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
            El pago online no está disponible ahora mismo.{' '}
            <Link href="/contacto" className="underline">
              Escríbenos
            </Link>{' '}
            o a {site.contact.email} y cerramos tu pedido contigo.
          </p>
        )}
      </div>
    </section>
  )
}
