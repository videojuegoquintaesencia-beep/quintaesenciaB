'use client'
import { Check } from 'lucide-react'
import { useCatalogProduct } from '@/components/catalog/CatalogProvider'
import { cn } from '@/lib/cn'
import { formatEUR, formatNumber } from '@/lib/format'
import { useEditor } from '@/lib/editor/store'
import { Group, PanelTitle } from '../ui'

export function ProductPanel() {
  const productId = useEditor((s) => s.productId)
  const design = useEditor((s) => s.design)
  const viewId = useEditor((s) => s.viewId)
  const areaId = useEditor((s) => s.areaId)
  // Producto con los suplementos de color efectivos (editables en el panel).
  const product = useCatalogProduct(productId)
  if (!product) return null

  const selected = product.colors.find((c) => c.id === design.colorId) ?? product.colors[0]
  const view = product.views.find((v) => v.id === viewId) ?? product.views[0]
  const isMug = product.id === 'taza'
  const layersIn = (ids: string[]) => ids.reduce((n, id) => n + (design.areas[id]?.layers.length ?? 0), 0)

  return (
    <div>
      <PanelTitle hint="Cambia el color o la zona cuando quieras: tu diseño se conserva.">Producto</PanelTitle>

      <Group title={isMug ? 'Color del interior y el asa' : 'Color de la prenda'}>
        <div role="group" aria-label="Colores disponibles" className="flex flex-wrap gap-2.5">
          {product.colors.map((c) => {
            const on = c.id === selected.id
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                aria-label={c.name}
                title={c.name}
                onClick={() => {
                  useEditor.getState().setColor(c.id)
                  useEditor.getState().announce(`Color: ${c.name}.`)
                }}
                className={cn(
                  'relative inline-flex size-11 items-center justify-center rounded-full border-2 border-ink lg:size-10',
                  on && 'ring-[3px] ring-violet-deep ring-offset-2',
                )}
                style={{ backgroundColor: c.hex }}
              >
                {on && <Check aria-hidden="true" className="size-5" strokeWidth={3.5} style={{ color: c.light ? '#1b1340' : '#ffffff' }} />}
              </button>
            )
          })}
        </div>
        <p className="mt-2.5 text-sm" aria-live="polite">
          <span className="font-extrabold">{selected.name}</span>
          {selected.surchargeCents ? <span className="text-ink-soft"> · +{formatEUR(selected.surchargeCents)} por unidad</span> : null}
        </p>
        {isMug && <p className="field-hint">El cuerpo de la taza siempre es blanco; el color elegido es el del interior y el asa.</p>}
      </Group>

      {product.views.length > 1 && (
        <Group title="Vista">
          <div role="group" aria-label="Vista del producto" className="grid grid-cols-2 gap-2">
            {product.views.map((v) => {
              const on = v.id === view.id
              const count = layersIn(v.areas.map((a) => a.id))
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => useEditor.getState().setView(v.id)}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-ink px-3 font-display text-base font-semibold transition-colors',
                    on ? 'bg-pink shadow-pop-sm' : 'bg-paper hover:bg-yellow-soft',
                  )}
                >
                  {v.label}
                  {count > 0 && <span className="chip !bg-yellow !px-2 !py-0 !text-xs">{count}</span>}
                </button>
              )
            })}
          </div>
        </Group>
      )}

      <Group title="Zona de estampado">
        <div role="group" aria-label="Zonas de estampado de esta vista" className="grid gap-2">
          {view.areas.map((a) => {
            const on = a.id === areaId
            const count = design.areas[a.id]?.layers.length ?? 0
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => useEditor.getState().setArea(a.id)}
                className={cn(
                  'flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-ink px-4 py-2 text-left transition-colors',
                  on ? 'bg-pink shadow-pop-sm' : 'bg-paper hover:bg-yellow-soft',
                )}
              >
                <span>
                  <span className="block font-display text-base font-semibold leading-tight">{a.label}</span>
                  <span className="block text-sm">Hasta {formatNumber(a.widthCm)} × {formatNumber(a.heightCm)} cm</span>
                </span>
                {count > 0 && <span className="chip !bg-yellow">Con diseño</span>}
              </button>
            )
          })}
        </div>
        <p className="field-hint">Lo que añadas se coloca en la zona marcada. Solo se imprime lo que queda dentro del recuadro.</p>
      </Group>
    </div>
  )
}
