import { ButtonLink } from '@/components/ui/Button'

export default function PanelNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border-2 border-ink bg-paper p-6 text-center shadow-pop-sm">
      <h1 className="text-2xl">No encontramos eso</h1>
      <p className="mt-2 text-ink-soft">El pedido o el mensaje que buscas no existe o se ha borrado.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/admin/pedidos" variant="secondary">
          Ver pedidos
        </ButtonLink>
        <ButtonLink href="/admin" variant="plain">
          Ir al resumen
        </ButtonLink>
      </div>
    </div>
  )
}
