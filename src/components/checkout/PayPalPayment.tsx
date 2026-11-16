'use client'
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { useEffect, useRef } from 'react'
import { CheckoutError, postJson } from './api'
import type { PaymentBridge } from './payment-types'

/** Muestra los botones, o un aviso claro si el script de PayPal no se pudo cargar (red, bloqueador de anuncios…). */
function Buttons({ bridge }: { bridge: PaymentBridge }) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  // Los botones se montan una sola vez: sus callbacks leen siempre la última versión del formulario.
  const latest = useRef(bridge)
  useEffect(() => {
    latest.current = bridge
  })
  const orderIdRef = useRef<string | null>(null)

  if (isRejected) {
    return (
      <p role="alert" className="rounded-2xl border-2 border-ink bg-danger-soft p-4 font-bold">
        No hemos podido cargar PayPal. Revisa tu conexión o desactiva el bloqueador de anuncios para esta página y
        recarga. Si sigue sin funcionar, escríbenos y cerramos el pedido contigo.
      </p>
    )
  }

  return (
    <div className={bridge.processing ? 'pointer-events-none opacity-50' : undefined} aria-busy={bridge.processing || isPending}>
      {isPending && <div className="h-12 animate-pulse rounded-full border-2 border-ink bg-cream" role="status" aria-label="Cargando PayPal" />}
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'pill', label: 'pay', height: 48 }}
        onClick={(_data, actions) => (latest.current.validate() ? actions.resolve() : actions.reject())}
        createOrder={async () => {
          const order = await latest.current.createServerOrder()
          if (!order.paypalOrderId) throw new Error('Falta el pedido de PayPal')
          orderIdRef.current = order.orderId
          return order.paypalOrderId
        }}
        onApprove={async (data) => {
          const b = latest.current
          b.setProcessing(true)
          try {
            const res = await postJson<{ redirect?: string; pending?: boolean; error?: string }>('/api/paypal/capture', {
              orderId: orderIdRef.current,
              paypalOrderId: data.orderID,
            })
            if (!res.ok) b.onFailure(res.failure)
            // Pago aceptado (o pendiente de revisión en PayPal): el carrito ya no debe quedarse, para no pagar dos veces.
            else if (res.data.redirect) b.onPaid(res.data.redirect)
            else b.onNotice(res.data.error ?? 'PayPal está revisando tu pago. Te avisaremos por email cuando se confirme.')
          } finally {
            b.setProcessing(false)
          }
        }}
        onCancel={() => latest.current.onNotice('Has cancelado el pago. No se ha cobrado nada y tu carrito sigue como lo dejaste.')}
        onError={(err) => {
          if (err instanceof CheckoutError) return // ya se ha mostrado el motivo
          latest.current.onFailure({
            message: 'PayPal ha tenido un problema. No se ha cobrado nada; inténtalo de nuevo en unos minutos.',
            status: 0,
          })
        }}
      />
    </div>
  )
}

/** Botones de PayPal. Solo se carga en /checkout y únicamente si PayPal está configurado. */
export default function PayPalPayment({ clientId, bridge }: { clientId: string; bridge: PaymentBridge }) {
  return (
    <PayPalScriptProvider options={{ clientId, currency: 'EUR', locale: 'es_ES', intent: 'capture', components: 'buttons' }}>
      <Buttons bridge={bridge} />
    </PayPalScriptProvider>
  )
}
