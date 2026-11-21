'use client'
/**
 * Piezas comunes de los formularios de ajustes del panel: guardado/restablecimiento de una sección
 * (con confirmación en línea), aviso de resultado e indicador de "personalizado" / "por defecto".
 */
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { resetSettingsSection, saveSettingsSection } from '@/lib/admin/settings-client'
import type { SettingsSection } from '@/lib/settings-schema'
import { cn } from '@/lib/cn'
import { Feedback } from '../Feedback'

export type Notice = { kind: 'success' | 'error' | 'warning'; text: string }
export type Busy = 'save' | 'reset' | null
export type FieldErrors = Record<string, string>

/** Guardar y restablecer una sección: ocupado, aviso y refresco de los componentes de servidor. */
export function useSettingsSection(section: SettingsSection) {
  const router = useRouter()
  const [busy, setBusy] = useState<Busy>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  async function save(value: unknown, successText: string): Promise<boolean> {
    if (busy) return false
    setBusy('save')
    setNotice(null)
    const result = await saveSettingsSection(section, value)
    setBusy(null)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return false
    }
    setNotice({ kind: 'success', text: successText })
    router.refresh()
    return true
  }

  async function reset(successText: string): Promise<boolean> {
    if (busy) return false
    setBusy('reset')
    setNotice(null)
    const result = await resetSettingsSection(section)
    setBusy(null)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return false
    }
    setNotice({ kind: 'success', text: successText })
    router.refresh()
    return true
  }

  return { busy, notice, setNotice, save, reset }
}

/** Lleva el foco al primer campo marcado como inválido dentro de un contenedor. */
export function focusFirstInvalid(container: HTMLElement | null) {
  requestAnimationFrame(() => {
    container?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })
}

export function OverriddenBadge({ overridden }: { overridden: boolean }) {
  return (
    <span className={cn('chip', overridden ? 'bg-yellow' : 'bg-paper text-ink-soft')}>
      {overridden ? 'Valores personalizados' : 'Valores por defecto'}
    </span>
  )
}

/** Mensaje de error de un campo (mismo estilo que los formularios de la tienda). */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  )
}

/** Campo de texto corto del panel con etiqueta, ayuda y error accesibles. */
export function SettingsInput({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  inputMode = 'text',
  suffix,
  className,
  maxLength,
  ariaLabel,
}: {
  id: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: ReactNode
  inputMode?: 'text' | 'decimal' | 'numeric'
  /** Unidad que se muestra pegada al campo ("€", "cm²", "días"). */
  suffix?: string
  className?: string
  maxLength?: number
  /** Etiqueta completa para el lector cuando la visible es corta (p. ej. "XXL"). */
  ariaLabel?: string
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          className={cn('input', suffix && 'min-w-0 flex-1')}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          maxLength={maxLength}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && (
          <span aria-hidden="true" className="shrink-0 text-sm font-bold text-ink-soft">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

/** Botonera de una sección: guardar, aviso de cambios sin guardar, restablecer (con confirmación) y resultado. */
export function SettingsActions({
  saveLabel,
  busy,
  dirty,
  overridden,
  onReset,
  notice,
  description,
}: {
  saveLabel: string
  busy: Busy
  dirty: boolean
  overridden: boolean
  onReset: () => Promise<void>
  notice: Notice | null
  /** Qué vuelve a los valores de serie al restablecer. */
  description: string
}) {
  const uid = useId()
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)

  // Al abrir la confirmación el foco pasa al botón definitivo; al cerrarla (cancelar o terminar) vuelve al de
  // restablecer si sigue existiendo. Se hace tras el commit, cuando los botones ya están en el DOM.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
    else if (wasConfirming.current) resetRef.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])

  return (
    <div className="space-y-3 border-t-2 border-ink/15 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy !== null} aria-busy={busy === 'save'}>
          {busy === 'save' ? 'Guardando…' : saveLabel}
        </button>
        {dirty && !busy && <span className="text-sm font-bold">Cambios sin guardar</span>}
        {overridden && !confirming && (
          <button ref={resetRef} type="button" className="btn sm:ml-auto" disabled={busy !== null} onClick={() => setConfirming(true)}>
            <RotateCcw size={18} aria-hidden="true" />
            Restablecer valores por defecto
          </button>
        )}
      </div>
      {confirming && (
        <div
          role="group"
          aria-labelledby={`${uid}-confirm`}
          className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink bg-yellow-soft px-3 py-2.5"
        >
          <p id={`${uid}-confirm`} className="text-sm font-bold">
            ¿Restablecer? {description} Esta acción no se puede deshacer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              ref={confirmRef}
              type="button"
              className="btn btn-sm btn-danger"
              disabled={busy !== null}
              aria-busy={busy === 'reset'}
              onClick={async () => {
                await onReset()
                setConfirming(false)
              }}
            >
              {busy === 'reset' ? 'Restableciendo…' : 'Sí, restablecer'}
            </button>
            <button type="button" className="btn btn-sm" disabled={busy !== null} onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {notice && <Feedback kind={notice.kind}>{notice.text}</Feedback>}
    </div>
  )
}
