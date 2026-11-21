'use client'

import { useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { Feedback } from '../Feedback'
import type { SettingsNotice } from './useSettingsSection'

/**
 * Pie común de los formularios de ajustes: guardar, aviso de cambios sin guardar, restablecer con confirmación en
 * línea (el foco pasa al botón de confirmar y vuelve al de restablecer al cancelar) y el mensaje de resultado.
 */
export function SettingsFormActions({
  dirty,
  busy,
  notice,
  overridden,
  confirmingReset,
  onConfirmReset,
  onReset,
  sectionLabel,
}: {
  dirty: boolean
  busy: 'save' | 'reset' | null
  notice: SettingsNotice | null
  /** La sección tiene valores guardados en el panel (si no, no hay nada que restablecer). */
  overridden: boolean
  confirmingReset: boolean
  onConfirmReset: (open: boolean) => void
  onReset: () => void
  sectionLabel: string
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)
  const wasConfirming = useRef(false)
  const wasOverridden = useRef(overridden)

  useEffect(() => {
    if (confirmingReset) confirmRef.current?.focus()
    else if (wasConfirming.current) resetRef.current?.focus()
    wasConfirming.current = confirmingReset
  }, [confirmingReset])

  // Tras restablecer, el botón que tenía el foco desaparece (la sección deja de estar personalizada): el foco pasa al
  // mensaje de resultado en vez de perderse al principio de la página.
  useEffect(() => {
    if (wasOverridden.current && !overridden && document.activeElement === document.body) noticeRef.current?.focus()
    wasOverridden.current = overridden
  }, [overridden])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy !== null || !dirty} aria-busy={busy === 'save'} className="btn btn-primary">
          {busy === 'save' ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {dirty && !busy && <span className="text-sm font-bold">Cambios sin guardar</span>}
        {overridden && !confirmingReset && (
          <button
            ref={resetRef}
            type="button"
            onClick={() => onConfirmReset(true)}
            disabled={busy !== null}
            className="btn sm:ml-auto"
            aria-expanded={confirmingReset}
          >
            <RotateCcw size={18} aria-hidden="true" />
            Restablecer valores por defecto
          </button>
        )}
      </div>

      {confirmingReset && (
        <div role="group" aria-label="Confirmar restablecimiento" className="rounded-xl border-2 border-ink bg-yellow-soft p-4">
          <p className="font-bold">¿Restablecer «{sectionLabel}»?</p>
          <p className="mt-1 text-sm">
            Se borrará lo guardado en esta sección y la web volverá a usar los valores por defecto definidos en el código. Puedes
            volver a rellenarla cuando quieras.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button ref={confirmRef} type="button" onClick={onReset} disabled={busy !== null} aria-busy={busy === 'reset'} className="btn btn-danger">
              {busy === 'reset' ? 'Restableciendo…' : 'Sí, restablecer'}
            </button>
            <button type="button" onClick={() => onConfirmReset(false)} disabled={busy !== null} className="btn">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div ref={noticeRef} tabIndex={-1} className="rounded-xl">
          <Feedback kind={notice.kind}>{notice.text}</Feedback>
        </div>
      )}
    </div>
  )
}

/** Aviso en rojo bajo un campo que sigue con un dato de ejemplo ("[COMPLETAR…]" o un email .example). */
export function PlaceholderHint({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-danger">Dato de ejemplo: sustitúyelo antes de publicar. {children}</span>
}

/** Clases del contenedor de un campo que sigue con un dato de ejemplo: una banda roja a la izquierda. */
export const placeholderFieldClass = 'border-l-4 border-danger pl-3'
