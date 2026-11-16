import type { Metadata } from 'next'
import { connection } from 'next/server'
import { CheckoutClient } from '@/components/checkout/CheckoutClient'
import { paymentMode } from '@/lib/paypal'

export const metadata: Metadata = {
  title: 'Finalizar pedido',
  description: 'Introduce tus datos de envío y paga tu pedido personalizado de forma segura.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  // El modo de pago depende del entorno en tiempo de ejecución: no debe quedar fijado en el build.
  await connection()
  return (
    <div className="container-pop py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Finalizar pedido</h1>
      <CheckoutClient mode={paymentMode()} paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ''} />
    </div>
  )
}
