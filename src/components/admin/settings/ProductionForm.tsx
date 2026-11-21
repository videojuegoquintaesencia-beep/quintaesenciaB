'use client'
/**
 * Plazos de producción (días laborables) que citan la tienda, el checkout, los emails y la página del pedido.
 * Valida con `productionSchema` (el mismo que la API) y envía la sección completa.
 */
import { useId, useRef, useState } from 'react'
import { parseIntegerInput } from '@/lib/admin/euros'
import { DEFAULT_SETTINGS, productionSchema, type ProductionSettings } from '@/lib/settings-schema'
import { fieldErrors } from '@/lib/validators'
import { Panel } from '../Panel'
import { OverriddenBadge, SettingsActions, SettingsInput, focusFirstInvalid, useSettingsSection, type FieldErrors } from './shared'

interface Draft {
  leadDaysMin: string
  leadDaysMax: string
}

const toDraft = (p: ProductionSettings): Draft => ({ leadDaysMin: String(p.leadDaysMin), leadDaysMax: String(p.leadDaysMax) })

function parseDraft(d: Draft): { value: ProductionSettings | null; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const leadDaysMin = parseIntegerInput(d.leadDaysMin)
  const leadDaysMax = parseIntegerInput(d.leadDaysMax)
  if (leadDaysMin === null) errors.leadDaysMin = 'Escribe un número entero de días.'
  if (leadDaysMax === null) errors.leadDaysMax = 'Escribe un número entero de días.'
  if (Object.keys(errors).length > 0) return { value: null, errors }
  const parsed = productionSchema.safeParse({ leadDaysMin, leadDaysMax })
  if (!parsed.success) return { value: null, errors: fieldErrors(parsed.error) }
  return { value: parsed.data, errors: {} }
}

export function ProductionForm({ initial, overridden: initialOverridden }: { initial: ProductionSettings; overridden: boolean }) {
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial))
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(initial)))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [overridden, setOverridden] = useState(initialOverridden)
  const { busy, notice, setNotice, save, reset } = useSettingsSection('production')
  const dirty = JSON.stringify(draft) !== saved

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseDraft(draft)
    setErrors(result.errors)
    if (!result.value) {
      setNotice({ kind: 'error', text: 'Revisa los plazos: hay datos que faltan o no son válidos.' })
      focusFirstInvalid(formRef.current)
      return
    }
    if (await save(result.value, 'Plazos guardados. La tienda, el checkout y los emails ya citan los nuevos días.')) {
      const normalized = toDraft(result.value)
      setDraft(normalized)
      setSaved(JSON.stringify(normalized))
      setOverridden(true)
    }
  }

  async function restore() {
    if (await reset('Plazos restablecidos: vuelven a aplicarse los valores por defecto.')) {
      const defaults = toDraft(DEFAULT_SETTINGS.production)
      setDraft(defaults)
      setSaved(JSON.stringify(defaults))
      setErrors({})
      setOverridden(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <OverriddenBadge overridden={overridden} />
        <p className="text-sm text-ink-soft">Días laborables de producción antes del envío (plazo orientativo que ve el cliente).</p>
      </div>
      <Panel id="plazos" title="Plazo de producción">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsInput
            id={`${uid}-min`}
            label="Mínimo"
            value={draft.leadDaysMin}
            onChange={(v) => setDraft((d) => ({ ...d, leadDaysMin: v }))}
            error={errors.leadDaysMin}
            inputMode="numeric"
            suffix="días"
          />
          <SettingsInput
            id={`${uid}-max`}
            label="Máximo"
            value={draft.leadDaysMax}
            onChange={(v) => setDraft((d) => ({ ...d, leadDaysMax: v }))}
            error={errors.leadDaysMax}
            inputMode="numeric"
            suffix="días"
          />
        </div>
        <p className="field-hint mt-2" aria-live="polite">
          En la tienda se leerá: «Producción de {draft.leadDaysMin || '…'} a {draft.leadDaysMax || '…'} días laborables».
        </p>
      </Panel>
      <SettingsActions
        saveLabel="Guardar plazos"
        busy={busy}
        dirty={dirty}
        overridden={overridden}
        onReset={restore}
        notice={notice}
        description="Los plazos vuelven a los valores de serie."
      />
    </form>
  )
}
