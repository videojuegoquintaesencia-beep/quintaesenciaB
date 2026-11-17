import { Banknote } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatEUR } from '@/lib/format'
import type { Order } from '@/lib/orders'
import { adminDateTime } from '@/lib/admin/dates'
import { CopyButton } from './CopyButton'
import { Panel } from './Panel'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-all text-right font-bold">{children}</dd>
    </div>
  )
}

/** Pago (proveedor, referencias de PayPal, fecha) y desglose del total con el IVA incluido. */
export function PaymentPanel({ order }: { order: Order }) {
  const p = order.payment
  const captured = p.status === 'captured'
  return (
    <Panel title="Pago y totales" id="pago" icon={<Banknote size={20} />}>
      <dl className="divide-y-2 divide-ink/10 text-[0.95rem]">
        <Row label="Método">
          <Badge tone={p.provider === 'paypal' ? 'info' : 'warning'}>{p.provider === 'paypal' ? 'PayPal' : 'Pago de demostración'}</Badge>
        </Row>
        <Row label="Estado del pago">
          <Badge tone={captured ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>
            {captured ? 'Cobrado' : p.status === 'failed' ? 'Fallido' : 'Sin cobrar'}
          </Badge>
        </Row>
        <Row label="Pagado el">{p.paidAt ? adminDateTime(p.paidAt) : '—'}</Row>
        {p.paypalOrderId && (
          <Row label="Pedido PayPal">
            <span className="font-mono text-sm">{p.paypalOrderId}</span>
          </Row>
        )}
        {p.paypalCaptureId && (
          <Row label="Captura PayPal">
            <span className="font-mono text-sm">{p.paypalCaptureId}</span>
          </Row>
        )}
      </dl>
      {p.provider === 'demo' && (
        <p className="mt-2 text-sm text-ink-soft">Este pago se simuló en modo demostración: no hay cobro real en PayPal.</p>
      )}
      {(p.paypalOrderId || p.paypalCaptureId) && (
        <div className="mt-2">
          <CopyButton text={p.paypalCaptureId ?? p.paypalOrderId ?? ''} label="Copiar referencia" />
        </div>
      )}

      <dl className="mt-4 divide-y-2 divide-ink/10 border-t-2 border-ink pt-2 text-[0.95rem]">
        <Row label="Productos">{formatEUR(order.subtotalCents)}</Row>
        <Row label="Envío">{order.shippingCents === 0 ? 'Gratis' : formatEUR(order.shippingCents)}</Row>
        <div className="flex items-baseline justify-between gap-3 py-2 text-lg">
          <dt className="font-extrabold">Total</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums">{formatEUR(order.totalCents)}</dd>
        </div>
        <Row label="IVA incluido (21&nbsp;%)">{formatEUR(order.vatCents)}</Row>
      </dl>
    </Panel>
  )
}
