'use client'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CheckoutError, postJson } from './api'
import type { PaymentBridge } from './payment-types'

/** Pago simulado para desarrollo y demostraciones (solo si PayPal no está configurado). */
export function DemoPayment({ bridge }: { bridge: PaymentBridge }) {
  async function pay() {
    if (!bridge.validate()) return
    bridge.setProcessing(true)
    try {
      const { orderId } = await bridge.createServerOrder()
      const res = await postJson<{ redirect: string }>('/api/checkout/demo-pay', { orderId })
      if (!res.ok) {
        bridge.onFailure(res.failure)
        return
      }
      bridge.onPaid(res.data.redirect)
    } catch (err) {
      if (!(err instanceof CheckoutError)) bridge.onFailure({ message: 'No hemos podido completar el pedido.', status: 0 })
    } finally {
      bridge.setProcessing(false)
    }
  }

  return (
    <div>
      <p className="flex gap-2 rounded-2xl border-2 border-ink bg-sky-soft p-3 text-sm font-bold">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Modo demostración: PayPal no está configurado, así que el pago es simulado y no se cobra nada. El pedido se
          crea de verdad.
        </span>
      </p>
      <Button variant="secondary" size="lg" block className="mt-4" onClick={pay} disabled={bridge.processing}>
        {bridge.processing ? 'Procesando…' : 'Pedido con obligación de pago (modo demostración)'}
      </Button>
    </div>
  )
}
