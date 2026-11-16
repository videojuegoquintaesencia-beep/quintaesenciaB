import type { Product } from '@/config/products'
import { sizeLabel } from './appearance'

/** Zonas de estampado con su tamaño máximo y un esquema a escala (la misma escala para todas las zonas del producto). */
export function PrintZones({ product }: { product: Product }) {
  const zones = product.views.flatMap((view) => view.areas.map((area) => ({ area, view })))
  const largest = Math.max(...zones.map(({ area }) => Math.max(area.widthCm, area.heightCm)))
  const scale = 132 / largest

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {zones.map(({ area, view }) => (
        <li key={`${view.id}-${area.id}`} className="card-flat flex items-center gap-5 p-5">
          <div className="grid h-[9.5rem] w-[9.5rem] shrink-0 place-items-center rounded-2xl bg-pink-soft" aria-hidden="true">
            <div
              className="rounded-md border-2 border-dashed border-ink bg-paper"
              style={{ width: area.widthCm * scale, height: area.heightCm * scale }}
            />
          </div>
          <div>
            <h3 className="text-xl">{area.label}</h3>
            <p className="mt-1 font-display text-lg font-semibold text-violet-deep">hasta {sizeLabel(area.widthCm, area.heightCm)}</p>
            <p className="mt-1 text-sm text-ink-soft">Vista: {view.label.toLowerCase()}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
