'use client'

import { useId, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { postJson } from '@/lib/admin/client'
import { Feedback } from './Feedback'
import { Panel } from './Panel'

/** Nota interna (solo para el equipo). Se guarda con el botón; avisa si hay cambios sin guardar. */
export function NoteForm({
  endpoint,
  field,
  initial,
  title = 'Nota interna',
  hint = 'Solo la ves tú: el cliente nunca la recibe.',
  bare,
}: {
  endpoint: string
  /** Nombre del campo en el cuerpo JSON ("note" en pedidos, "adminNote" en presupuestos). */
  field: 'note' | 'adminNote'
  initial: string
  title?: string
  hint?: string
  /** Sin marco (cuando va dentro de otro formulario o panel). */
  bare?: boolean
}) {
  const uid = useId()
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const dirty = value !== saved

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !dirty) return
    setBusy(true)
    setNotice(null)
    const result = await postJson(endpoint, { [field]: value })
    setBusy(false)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return
    }
    setSaved(value)
    setNotice({ kind: 'success', text: 'Nota guardada.' })
  }

  const form = (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label htmlFor={`${uid}-note`} className="label">
          {bare ? title : 'Texto de la nota'}
        </label>
        <textarea
          id={`${uid}-note`}
          className="textarea"
          value={value}
          maxLength={2000}
          onChange={(e) => {
            setValue(e.target.value)
            setNotice(null)
          }}
          aria-describedby={`${uid}-hint`}
        />
        <p id={`${uid}-hint`} className="field-hint">
          {hint}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !dirty} aria-busy={busy} className="btn btn-secondary">
          {busy ? 'Guardando…' : 'Guardar nota'}
        </button>
        {dirty && !busy && <span className="text-sm font-bold text-ink-soft">Cambios sin guardar</span>}
      </div>
      {notice && <Feedback kind={notice.kind}>{notice.text}</Feedback>}
    </form>
  )

  if (bare) return form
  return (
    <Panel title={title} id="nota" icon={<StickyNote size={20} />}>
      {form}
    </Panel>
  )
}
