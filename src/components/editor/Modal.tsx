'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/** Diálogo modal nativo (<dialog>): atrapa el foco, se cierra con Esc y devuelve el foco al cerrar. */
export function Modal({
  open,
  onClose,
  title,
  titleId,
  dismissible = true,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  titleId: string
  dismissible?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onClose()
      }}
      onClose={() => open && dismissible && onClose()}
      className="m-auto w-[min(92vw,26rem)] rounded-3xl border-2 border-ink bg-paper p-0 text-ink shadow-pop-lg backdrop:bg-ink/60"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <h2 id={titleId} className="mb-3 text-2xl">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  )
}
