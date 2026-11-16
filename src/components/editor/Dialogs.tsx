'use client'
import Link from 'next/link'
import { useId } from 'react'
import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Modal } from './Modal'
import type { CartState } from './useAddToCart'

export function CartDialog({ state, onClose, onRetry }: { state: CartState; onClose: () => void; onRetry: () => void }) {
  const titleId = useId()
  const { phase, progress } = state
  const open = phase !== 'idle'
  const total = Math.max(progress.total, 1)

  const title =
    phase === 'working' ? 'Preparando tu diseño...' : phase === 'error' ? 'No hemos podido preparar tu diseño' : state.edited ? 'Cambios guardados' : '¡Añadido al carrito!'

  return (
    <Modal open={open} onClose={onClose} title={title} titleId={titleId} dismissible={phase !== 'working'}>
      {phase === 'working' && (
        <div aria-live="polite">
          <p className="mb-3 flex items-center gap-2 text-ink-soft">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            Creamos las vistas y el archivo de impresión. Solo tarda unos segundos.
          </p>
          <progress
            className="h-4 w-full overflow-hidden rounded-full border-2 border-ink bg-cream [&::-moz-progress-bar]:bg-pink [&::-webkit-progress-bar]:bg-cream [&::-webkit-progress-value]:bg-pink"
            max={total}
            value={progress.total === 0 ? undefined : progress.done}
            aria-label="Progreso"
          />
        </div>
      )}

      {phase === 'error' && (
        <div>
          <p role="alert" className="mb-4 flex gap-2 rounded-xl border-2 border-ink bg-danger-soft p-3 text-sm font-bold">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
          <p className="mb-4 text-sm text-ink-soft">Tu diseño sigue intacto en el editor. Puedes reintentarlo ahora o seguir editando.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>Reintentar</button>
            <button type="button" className="btn btn-sm" onClick={onClose}>Seguir diseñando</button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div>
          {state.previewId && (
            <div className="mb-4 flex justify-center rounded-2xl border-2 border-ink bg-cream p-2 bg-dots-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${state.previewId}`} alt="Vista previa de tu diseño" className="max-h-52 w-auto object-contain" />
            </div>
          )}
          <p className="mb-4 flex items-center gap-2 font-bold">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
            {state.edited ? 'Hemos actualizado tu diseño en el carrito.' : 'Tu diseño ya está en el carrito.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/carrito" className="btn btn-primary btn-sm">Ir al carrito</Link>
            <button type="button" className="btn btn-sm" onClick={onClose}>Seguir diseñando</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function ConfirmStartOver({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const titleId = useId()
  return (
    <Modal open={open} onClose={onClose} title="¿Empezar de nuevo?" titleId={titleId}>
      <p className="mb-4 text-ink-soft">Se quitarán todos los elementos de todas las zonas. Podrás recuperarlos con «Deshacer».</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          Sí, empezar de nuevo
        </button>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  )
}
