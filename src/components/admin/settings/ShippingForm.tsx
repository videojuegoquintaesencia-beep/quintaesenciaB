'use client'
/**
 * Envíos editables desde el panel: importes (tarifa, envío gratis desde, suplemento de Baleares), prefijos de
 * código postal a los que no se envía y los textos que cita la tienda (zonas excluidas, transportista, zonas de
 * entrega). Valida con `shippingSchema` (el mismo que la API) y envía la sección completa.
 */
import { Plus, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { centsToEuroInput, euroInputToCents } from '@/lib/admin/euros'
import { provinceFromPostalCode } from '@/lib/es-provinces'
import { DEFAULT_SETTINGS, shippingSchema, type ShippingSettings } from '@/lib/settings-schema'
import { fieldErrors } from '@/lib/validators'
import { Panel } from '../Panel'
import { FieldError, OverriddenBadge, SettingsActions, SettingsInput, focusFirstInvalid, useSettingsSection, type FieldErrors } from './shared'

interface Draft {
  flat: string
  freeFrom: string
  balearesExtra: string
  excludedPostalPrefixes: string[]
  excludedZonesLabel: string
  carrierLabel: string
  deliveryZonesLabel: string
}

const MONEY_ERROR = 'Escribe un importe en euros, p. ej. 4,95.'

function toDraft(s: ShippingSettings): Draft {
  return {
    flat: centsToEuroInput(s.flatCents),
    freeFrom: centsToEuroInput(s.freeFromCents),
    balearesExtra: centsToEuroInput(s.balearesExtraCents),
    excludedPostalPrefixes: [...s.excludedPostalPrefixes],
    excludedZonesLabel: s.excludedZonesLabel,
    carrierLabel: s.carrierLabel,
    deliveryZonesLabel: s.deliveryZonesLabel,
  }
}

function parseDraft(d: Draft): { value: ShippingSettings | null; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const money = (text: string, key: string) => {
    const cents = euroInputToCents(text)
    if (cents === null) errors[key] = MONEY_ERROR
    return cents ?? 0
  }
  const candidate: ShippingSettings = {
    flatCents: money(d.flat, 'flatCents'),
    freeFromCents: money(d.freeFrom, 'freeFromCents'),
    balearesExtraCents: money(d.balearesExtra, 'balearesExtraCents'),
    excludedPostalPrefixes: d.excludedPostalPrefixes,
    excludedZonesLabel: d.excludedZonesLabel.trim(),
    carrierLabel: d.carrierLabel.trim(),
    deliveryZonesLabel: d.deliveryZonesLabel.trim(),
  }
  // El nombre de las zonas excluidas aparece en los mensajes del checkout («Aún no enviamos a …»): si hay prefijos
  // excluidos no puede quedar vacío, aunque el esquema lo permita.
  if (candidate.excludedPostalPrefixes.length > 0 && !candidate.excludedZonesLabel) {
    errors.excludedZonesLabel = 'Escribe el nombre de las zonas excluidas: aparece en los mensajes del checkout.'
  }
  if (Object.keys(errors).length > 0) return { value: null, errors }
  const parsed = shippingSchema.safeParse(candidate)
  if (!parsed.success) return { value: null, errors: fieldErrors(parsed.error) }
  return { value: parsed.data, errors: {} }
}

export function ShippingForm({ initial, overridden: initialOverridden }: { initial: ShippingSettings; overridden: boolean }) {
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial))
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(initial)))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [overridden, setOverridden] = useState(initialOverridden)
  const [newPrefix, setNewPrefix] = useState('')
  const [prefixError, setPrefixError] = useState<string | undefined>(undefined)
  const { busy, notice, setNotice, save, reset } = useSettingsSection('shipping')
  const dirty = JSON.stringify(draft) !== saved
  const patch = (p: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...p }))

  function addPrefix() {
    const prefix = newPrefix.trim()
    if (!/^\d{2}$/.test(prefix)) return setPrefixError('Escribe los dos primeros dígitos del código postal, p. ej. 35.')
    if (!provinceFromPostalCode(prefix)) return setPrefixError('No hay ninguna provincia con ese prefijo (van del 01 al 52).')
    if (draft.excludedPostalPrefixes.includes(prefix)) return setPrefixError('Ese prefijo ya está en la lista.')
    setPrefixError(undefined)
    setNewPrefix('')
    patch({ excludedPostalPrefixes: [...draft.excludedPostalPrefixes, prefix].sort() })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseDraft(draft)
    setErrors(result.errors)
    if (!result.value) {
      setNotice({ kind: 'error', text: 'Revisa los campos marcados: hay datos que faltan o no son válidos.' })
      focusFirstInvalid(formRef.current)
      return
    }
    if (await save(result.value, 'Envíos guardados. El carrito, el checkout y los textos de la tienda ya usan los nuevos valores.')) {
      const normalized = toDraft(result.value)
      setDraft(normalized)
      setSaved(JSON.stringify(normalized))
      setOverridden(true)
    }
  }

  async function restore() {
    if (await reset('Envíos restablecidos: vuelven a aplicarse los valores por defecto.')) {
      const defaults = toDraft(DEFAULT_SETTINGS.shipping)
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
        <p className="text-sm text-ink-soft">Importes en euros, IVA incluido.</p>
      </div>

      <Panel id="importes-envio" title="Importes">
        <div className="grid gap-4 sm:grid-cols-3">
          <SettingsInput
            id={`${uid}-flat`}
            label="Tarifa de envío"
            value={draft.flat}
            onChange={(v) => patch({ flat: v })}
            error={errors.flatCents}
            hint="Península."
            inputMode="decimal"
            suffix="€"
          />
          <SettingsInput
            id={`${uid}-free`}
            label="Envío gratis desde"
            value={draft.freeFrom}
            onChange={(v) => patch({ freeFrom: v })}
            error={errors.freeFromCents}
            hint="Importe de los productos, descuentos incluidos."
            inputMode="decimal"
            suffix="€"
          />
          <SettingsInput
            id={`${uid}-baleares`}
            label="Suplemento Baleares"
            value={draft.balearesExtra}
            onChange={(v) => patch({ balearesExtra: v })}
            error={errors.balearesExtraCents}
            hint="Se suma a la tarifa cuando el envío no es gratis."
            inputMode="decimal"
            suffix="€"
          />
        </div>
      </Panel>

      <Panel id="zonas-excluidas" title="Zonas a las que no se envía">
        <p className="mb-3 text-sm text-ink-soft">
          Prefijos de código postal (dos primeros dígitos) que el checkout rechaza. Con la lista vacía se envía a toda España.
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Prefijos excluidos">
          {draft.excludedPostalPrefixes.map((prefix) => (
            <li key={prefix} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-paper py-1 pl-3 pr-1 text-sm font-bold">
              <span>
                {prefix} · {provinceFromPostalCode(prefix) ?? 'sin provincia'}
              </span>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full hover:bg-cream"
                aria-label={`Quitar el prefijo ${prefix} (${provinceFromPostalCode(prefix) ?? 'sin provincia'})`}
                onClick={() => patch({ excludedPostalPrefixes: draft.excludedPostalPrefixes.filter((p) => p !== prefix) })}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
          {draft.excludedPostalPrefixes.length === 0 && <li className="text-sm text-ink-soft">Ningún prefijo excluido.</li>}
        </ul>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`${uid}-prefix`} className="label">
              Añadir prefijo
            </label>
            <input
              id={`${uid}-prefix`}
              className="input w-28"
              type="text"
              inputMode="numeric"
              maxLength={2}
              autoComplete="off"
              value={newPrefix}
              aria-invalid={prefixError ? true : undefined}
              aria-describedby={prefixError ? `${uid}-prefix-error` : `${uid}-prefix-hint`}
              onChange={(e) => {
                setNewPrefix(e.target.value.replace(/\D/g, '').slice(0, 2))
                setPrefixError(undefined)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPrefix()
                }
              }}
            />
          </div>
          <button type="button" className="btn" onClick={addPrefix}>
            <Plus size={18} aria-hidden="true" />
            Añadir
          </button>
        </div>
        {!prefixError && (
          <p id={`${uid}-prefix-hint`} className="field-hint">
            Dos dígitos, p. ej. 35 para Las Palmas.
          </p>
        )}
        <FieldError id={`${uid}-prefix-error`} message={prefixError} />
        <FieldError id={`${uid}-prefixes-error`} message={errors.excludedPostalPrefixes} />
      </Panel>

      <Panel id="textos-envio" title="Textos que cita la tienda">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsInput
            id={`${uid}-excluded-label`}
            label="Nombre de las zonas excluidas"
            value={draft.excludedZonesLabel}
            onChange={(v) => patch({ excludedZonesLabel: v })}
            error={errors.excludedZonesLabel}
            hint="«No enviamos a … desde la tienda online.»"
            maxLength={120}
          />
          <SettingsInput
            id={`${uid}-zones-label`}
            label="Zonas de entrega"
            value={draft.deliveryZonesLabel}
            onChange={(v) => patch({ deliveryZonesLabel: v })}
            error={errors.deliveryZonesLabel}
            hint="«Envío a …», en minúscula y con artículo si lo lleva."
            maxLength={120}
          />
          <SettingsInput
            id={`${uid}-carrier`}
            label="Transportista"
            value={draft.carrierLabel}
            onChange={(v) => patch({ carrierLabel: v })}
            error={errors.carrierLabel}
            hint="«… y después sale por mensajería 24-48 h.»"
            maxLength={80}
            className="sm:col-span-2"
          />
        </div>
      </Panel>

      <SettingsActions
        saveLabel="Guardar envíos"
        busy={busy}
        dirty={dirty}
        overridden={overridden}
        onReset={restore}
        notice={notice}
        description="Importes, prefijos excluidos y textos de envío vuelven a los valores de serie."
      />
    </form>
  )
}
