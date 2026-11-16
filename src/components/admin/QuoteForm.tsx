'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL, type QuoteStatus } from '@/lib/order-status'
import { postJson } from '@/lib/admin/client'
import { Feedback } from './Feedback'
import { Panel } from './Panel'

/** Estado y nota interna de un presupuesto o mensaje, en un único formulario. */
export function QuoteForm({
  quoteId,
  status,
  adminNote,
}: {
  quoteId: string
  status: QuoteStatus
  adminNote: string | null
}) {
  const router = useRouter()
  const uid = useId()
  const [statusValue, setStatusValue] = useState<QuoteStatus>(status)
  const [note, setNote] = useState(adminNote ?? '')
  const [saved, setSaved] = useState({ status, note: adminNote ?? '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const dirty = statusValue !== saved.status || note !== saved.note

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !dirty) return
    setBusy(true)
    setNotice(null)
    const result = await postJson(`/api/admin/quotes/${quoteId}`, { status: statusValue, adminNote: note })
    setBusy(false)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return
    }
    setSaved({ status: statusValue, note })
    setNotice({ kind: 'success', text: 'Cambios guardados.' })
    router.refresh()
  }

  return (
    <Panel title="Seguimiento interno" id="seguimiento" tone="yellow">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={`${uid}-status`} className="label">
            Estado
          </label>
          <select
            id={`${uid}-status`}
            className="select"
            value={statusValue}
            onChange={(e) => {
              setStatusValue(e.target.value as QuoteStatus)
              setNotice(null)
            }}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-note`} className="label">
            Nota interna
          </label>
          <textarea
            id={`${uid}-note`}
            className="textarea"
            value={note}
            maxLength={2000}
            onChange={(e) => {
              setNote(e.target.value)
              setNotice(null)
            }}
            aria-describedby={`${uid}-hint`}
          />
          <p id={`${uid}-hint`} className="field-hint">
            Precio acordado, qué falta por enviar… Solo la ves tú.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !dirty} aria-busy={busy} className="btn btn-primary">
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {dirty && !busy && <span className="text-sm font-bold">Cambios sin guardar</span>}
        </div>
        {notice && <Feedback kind={notice.kind}>{notice.text}</Feedback>}
      </form>
    </Panel>
  )
}
