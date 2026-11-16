'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/order-status'
import { postJson } from '@/lib/admin/client'
import { cn } from '@/lib/cn'
import { CarrierFields } from './CarrierFields'
import { Feedback } from './Feedback'
import { Panel } from './Panel'

/** Texto del botón de cada paso (verbos claros, para no confundirse de estado). */
const ACTION_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Volver a pendiente de pago',
  paid: 'Marcar como pagado',
  in_production: 'Pasar a producción',
  ready: 'Marcar como listo para enviar',
  shipped: 'Marcar como enviado',
  delivered: 'Marcar como entregado',
  cancelled: 'Cancelar pedido',
  refunded: 'Marcar como reembolsado',
}

const DESTRUCTIVE: OrderStatus[] = ['cancelled', 'refunded']

const WARNING: Partial<Record<OrderStatus, string>> = {
  paid: 'Hazlo solo si has comprobado que el pago está cobrado en PayPal.',
  cancelled:
    'El pedido se cancelará y no se podrá reabrir. Si el cliente ya pagó, devuélvele el dinero desde PayPal y márcalo como reembolsado.',
  refunded:
    'Esto solo anota el reembolso: no devuelve el dinero. Hazlo antes desde tu cuenta de PayPal. El pedido no se podrá reabrir.',
}

interface StatusResponse {
  statusLabel: string
  email: 'sent' | 'simulated' | 'failed' | 'skipped'
  emailTo: string
  emailError?: string
}

interface Notice {
  kind: 'success' | 'warning' | 'error'
  text: string
}

export function OrderStatusPanel({
  orderId,
  status,
  transitions,
  carrier,
  trackingCode,
  customerEmail,
}: {
  orderId: string
  status: OrderStatus
  transitions: OrderStatus[]
  carrier: string | null
  trackingCode: string | null
  customerEmail: string
}) {
  const router = useRouter()
  const uid = useId()
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [target, setTarget] = useState<OrderStatus | null>(null)
  const [note, setNote] = useState('')
  const [carrierValue, setCarrierValue] = useState(carrier ?? '')
  const [tracking, setTracking] = useState(trackingCode ?? '')
  const [withoutTracking, setWithoutTracking] = useState(false)
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (target) noteRef.current?.focus()
  }, [target])

  const forward = transitions.filter((s) => !DESTRUCTIVE.includes(s))
  const destructive = transitions.filter((s) => DESTRUCTIVE.includes(s))
  const needsTrackingConfirm = target === 'shipped' && tracking.trim() === '' && !withoutTracking

  function choose(next: OrderStatus) {
    setTarget(target === next ? null : next)
    setNotice(null)
    setWithoutTracking(false)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target || busy) return
    if (needsTrackingConfirm) {
      setNotice({ kind: 'warning', text: 'Añade el código de seguimiento o marca que lo envías sin él.' })
      return
    }
    setBusy(true)
    setNotice(null)
    const result = await postJson<StatusResponse>(`/api/admin/orders/${orderId}/status`, {
      status: target,
      note: note.trim() || undefined,
      carrier: target === 'shipped' ? carrierValue.trim() || undefined : undefined,
      trackingCode: target === 'shipped' ? tracking.trim() || undefined : undefined,
      notify,
    })
    setBusy(false)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      if (result.status === 409) router.refresh()
      return
    }
    const { statusLabel, email, emailTo, emailError } = result.data
    const base = `Estado cambiado a «${statusLabel}».`
    if (email === 'sent') setNotice({ kind: 'success', text: `${base} Hemos avisado a ${emailTo} por email.` })
    else if (email === 'simulated')
      setNotice({
        kind: 'warning',
        text: `${base} El email NO se ha enviado porque el servidor de correo (SMTP) no está configurado; solo queda en el registro del servidor.`,
      })
    else if (email === 'failed')
      setNotice({
        kind: 'warning',
        text: `${base} Pero no se pudo avisar a ${emailTo}${emailError ? ` (${emailError})` : ''}. Escríbele tú desde su ficha.`,
      })
    else setNotice({ kind: 'success', text: base })
    setTarget(null)
    setNote('')
    router.refresh()
  }

  return (
    <Panel title="Estado del pedido" id="estado" tone="yellow">
      {transitions.length === 0 ? (
        <p>
          Este pedido está en un estado final (<strong>{ORDER_STATUS_LABEL[status]}</strong>) y ya no admite más cambios.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm">Elige el siguiente paso. Solo aparecen los cambios posibles desde «{ORDER_STATUS_LABEL[status]}».</p>
          <div role="group" aria-label="Siguiente paso" className="flex flex-col gap-2.5">
            {forward.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => choose(s)}
                aria-expanded={target === s}
                aria-controls={`${uid}-form`}
                className={cn('btn btn-block', i === 0 ? 'btn-primary' : 'btn-secondary', target === s && 'ring-4 ring-violet')}
              >
                {ACTION_LABEL[s]}
              </button>
            ))}
            {destructive.length > 0 && (
              <div className="mt-1 grid gap-2.5 border-t-2 border-ink/20 pt-3 sm:grid-cols-2">
                {destructive.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => choose(s)}
                    aria-expanded={target === s}
                    aria-controls={`${uid}-form`}
                    className={cn('btn btn-sm text-danger!', target === s && 'ring-4 ring-violet')}
                  >
                    {ACTION_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {target && (
        <form
          id={`${uid}-form`}
          onSubmit={submit}
          className="mt-4 space-y-4 rounded-xl border-2 border-ink bg-paper p-3.5"
          aria-label={`Confirmar: ${ACTION_LABEL[target]}`}
        >
          <p className="font-display text-lg font-semibold">
            Vas a pasar el pedido a «{ORDER_STATUS_LABEL[target]}»
          </p>
          {WARNING[target] && <Feedback kind="warning">{WARNING[target]}</Feedback>}

          {target === 'shipped' && (
            <fieldset className="space-y-3">
              <legend className="sr-only">Datos del envío</legend>
              <CarrierFields carrier={carrierValue} tracking={tracking} onCarrier={setCarrierValue} onTracking={setTracking} />
              {tracking.trim() === '' && (
                <div>
                  <p className="field-hint">Con el código, el cliente podrá seguir su paquete: te recomendamos añadirlo.</p>
                  <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2.5 font-bold">
                    <input
                      type="checkbox"
                      checked={withoutTracking}
                      onChange={(e) => setWithoutTracking(e.target.checked)}
                      className="size-5 accent-pink"
                    />
                    Enviar sin código de seguimiento
                  </label>
                </div>
              )}
            </fieldset>
          )}

          <div>
            <label htmlFor={`${uid}-note`} className="label">
              Nota para el historial <span className="font-semibold text-ink-soft">(opcional)</span>
            </label>
            <textarea
              id={`${uid}-note`}
              ref={noteRef}
              className="textarea min-h-20!"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={`${uid}-note-hint`}
            />
            <p id={`${uid}-note-hint`} className="field-hint">
              Si avisas al cliente, esta nota también va en el email: no escribas nada interno aquí.
            </p>
          </div>

          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 font-bold">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-pink"
              />
              <span>
                Avisar al cliente por email
                <span className="block break-all text-sm font-semibold text-ink-soft">{customerEmail}</span>
              </span>
            </label>
            {notify && (
              <p className="mt-1 rounded-lg bg-cream px-3 py-2 text-sm text-ink-soft">
                Recibirá: «{ORDER_STATUS_CUSTOMER_TEXT[target]}»
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className={cn('btn flex-1', DESTRUCTIVE.includes(target) ? 'btn-danger' : 'btn-primary')}
            >
              {busy ? 'Guardando…' : `Confirmar: ${ORDER_STATUS_LABEL[target]}`}
            </button>
            <button type="button" className="btn" onClick={() => setTarget(null)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {notice && (
        <div className="mt-3">
          <Feedback kind={notice.kind}>{notice.text}</Feedback>
        </div>
      )}
    </Panel>
  )
}
