'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { ZodType } from 'zod'
import { deleteJson, postJson } from '@/lib/admin/client'
import { DEFAULT_SETTINGS, type Settings, type SettingsSection } from '@/lib/settings-schema'
import { fieldErrors } from '@/lib/validators'

export interface SettingsNotice {
  kind: 'success' | 'error' | 'warning'
  text: string
}

/**
 * Estado común de un formulario de sección de ajustes: valores, errores por campo (validados en el navegador con el
 * MISMO esquema zod que la API), guardado de la sección completa (POST) y vuelta a los valores por defecto (DELETE).
 * Tras cada cambio se refresca la página de servidor, que es la que sabe si la sección está "personalizada".
 */
export function useSettingsSection<S extends SettingsSection>({
  section,
  initial,
  schema,
}: {
  section: S
  initial: Settings[S]
  schema: ZodType<Settings[S]>
}) {
  const router = useRouter()
  const [values, setValues] = useState<Settings[S]>(initial)
  const [saved, setSaved] = useState<Settings[S]>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null)
  const [notice, setNotice] = useState<SettingsNotice | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)

  // Si hay cambios sin guardar, el navegador pide confirmación antes de cerrar o recargar la pestaña.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const setField = useCallback(<K extends keyof Settings[S]>(key: K, value: Settings[S][K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key as string]
      return next
    })
    setNotice(null)
  }, [])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setNotice(null)
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error)
      setErrors(errs)
      setNotice({ kind: 'error', text: Object.keys(errs).length === 1 ? 'Hay un campo que revisar.' : `Hay ${Object.keys(errs).length} campos que revisar.` })
      return
    }
    setErrors({})
    setBusy('save')
    const result = await postJson(`/api/admin/settings/${section}`, parsed.data)
    setBusy(null)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return
    }
    // Se guardan los valores ya normalizados (espacios recortados), que son los que ha aceptado el servidor.
    setValues(parsed.data)
    setSaved(parsed.data)
    setNotice({ kind: 'success', text: 'Cambios guardados. La web, los emails y el panel ya usan estos datos.' })
    router.refresh()
  }

  async function reset() {
    if (busy) return
    setBusy('reset')
    setNotice(null)
    const result = await deleteJson(`/api/admin/settings/${section}`)
    setBusy(null)
    setConfirmingReset(false)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return
    }
    const defaults = DEFAULT_SETTINGS[section]
    setValues(defaults)
    setSaved(defaults)
    setErrors({})
    setNotice({ kind: 'success', text: 'Sección restablecida: vuelven a usarse los valores por defecto definidos en el código.' })
    router.refresh()
  }

  return { values, setField, errors, dirty, busy, notice, save, reset, confirmingReset, setConfirmingReset }
}
