'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { Truck } from 'lucide-react'
import { postJson } from '@/lib/admin/client'
import { CarrierFields } from './CarrierFields'
import { Feedback } from './Feedback'
import { Panel } from './Panel'

interface TrackingResponse {
  email: 'sent' | 'simulated' | 'failed' | 'skipped'
  emailTo: string
  emailError?: string
}

/** Añadir o corregir el seguimiento de un pedido ya enviado (sin cambiar su estado). */
export function TrackingForm({
  orderId,
  carrier,
  trackingCode,
}: {
  orderId: string
  carrier: string | null
  trackingCode: string | null
}) {
  const router = useRouter()
  const uid = useId()
  const [carrierValue, setCarrierValue] = useState(carrier ?? '')
  const [tracking, setTracking] = useState(trackingCode ?? '')
  const [notify, setNotify] = useState(!trackingCode)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'warning' | 'error'; text: string } | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setNotice(null)
    const result = await postJson<TrackingResponse>(`/api/admin/orders/${orderId}/tracking`, {
      carrier: carrierValue.trim(),
      trackingCode: tracking.trim(),
      notify,
    })
    setBusy(false)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return
    }
    const { email, emailTo, emailError } = result.data
    if (email === 'sent') setNotice({ kind: 'success', text: `Seguimiento guardado y aviso enviado a ${emailTo}.` })
    else if (email === 'simulated')
      setNotice({ kind: 'warning', text: 'Seguimiento guardado. El email NO se ha enviado porque el servidor de correo (SMTP) no está configurado.' })
    else if (email === 'failed')
      setNotice({ kind: 'warning', text: `Seguimiento guardado, pero no se pudo avisar a ${emailTo}${emailError ? ` (${emailError})` : ''}.` })
    else setNotice({ kind: 'success', text: 'Seguimiento guardado.' })
    router.refresh()
  }

  return (
    <Panel title={trackingCode ? 'Seguimiento del envío' : 'Añadir seguimiento'} id="seguimiento" icon={<Truck size={20} />}>
      {trackingCode ? (
        <p className="mb-3">
          <span className="text-ink-soft">{carrier || 'Mensajería'} · </span>
          <strong className="break-all font-mono">{trackingCode}</strong>
        </p>
      ) : (
        <p className="mb-3 text-sm text-ink-soft">Este pedido se envió sin código de seguimiento. Añádelo cuando lo tengas.</p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <CarrierFields carrier={carrierValue} tracking={tracking} onCarrier={setCarrierValue} onTracking={setTracking} trackingRequired />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-bold" htmlFor={`${uid}-notify`}>
          <input
            id={`${uid}-notify`}
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="size-5 accent-pink"
          />
          Avisar al cliente por email
        </label>
        <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-secondary btn-block sm:w-auto">
          {busy ? 'Guardando…' : trackingCode ? 'Actualizar seguimiento' : 'Guardar seguimiento'}
        </button>
        {notice && <Feedback kind={notice.kind}>{notice.text}</Feedback>}
      </form>
    </Panel>
  )
}
