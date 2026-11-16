'use client'

import { Button } from '@/components/ui/Button'

/** Error inesperado dentro del panel: se puede reintentar sin perder el menú. */
export default function PanelError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-2xl border-2 border-ink bg-danger-soft p-6 text-center shadow-pop-sm">
      <h1 className="text-2xl">Algo no ha ido bien</h1>
      <p className="mt-2 text-ink-soft">No hemos podido cargar esta pantalla. Prueba de nuevo; si sigue fallando, recarga la página.</p>
      <Button className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </div>
  )
}
