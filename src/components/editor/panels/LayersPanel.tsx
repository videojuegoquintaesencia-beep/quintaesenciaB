'use client'
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Copy,
  FlipHorizontal2,
  Maximize2,
  MoveDown,
  MoveUp,
  Trash2,
  Type,
} from 'lucide-react'
import { getArea, getProduct } from '@/config/products'
import type { Layer } from '@/lib/design'
import { cn } from '@/lib/cn'
import { layerOutside, layerOverflows } from '@/lib/editor/geometry'
import { useEditor } from '@/lib/editor/store'
import { getSticker } from '@/lib/stickers'
import type { ImageMap } from '../useImages'
import { ResolutionHint } from '../ResolutionHint'
import { ActionButton, Group, NumberField, PanelTitle } from '../ui'

export function layerName(layer: Layer): string {
  if (layer.type === 'text') {
    const t = layer.text.replace(/\s+/g, ' ').trim()
    return t.length > 26 ? `${t.slice(0, 25)}…` : t
  }
  if (layer.type === 'image') return layer.name || 'Imagen'
  return getSticker(layer.stickerId)?.name ?? 'Pegatina'
}

function Thumb({ layer }: { layer: Layer }) {
  const box = 'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-ink bg-cream'
  if (layer.type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <span className={box}><img src={`/api/files/${layer.fileId}`} alt="" className="size-full object-contain" /></span>
  }
  if (layer.type === 'text') {
    return (
      <span className={box} style={{ backgroundColor: '#ffffff' }}>
        <Type aria-hidden="true" className="size-5" style={{ color: layer.fill, filter: 'drop-shadow(0 0 1px #1b1340)' }} strokeWidth={3} />
      </span>
    )
  }
  const sticker = getSticker(layer.stickerId)
  return (
    <span className={box}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="size-7">
        <path d={sticker?.path ?? ''} fill={layer.fill ?? sticker?.defaultFill} stroke="#1b1340" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function LayersPanel({ images }: { images: ImageMap }) {
  const productId = useEditor((s) => s.productId)
  const areaId = useEditor((s) => s.areaId)
  const layers = useEditor((s) => s.design.areas[s.areaId]?.layers) ?? []
  const selectedId = useEditor((s) => s.selectedId)
  const product = getProduct(productId)
  const area = product ? getArea(product, areaId) : undefined
  const selected = layers.find((l) => l.id === selectedId)
  const store = useEditor.getState
  const ordered = [...layers].reverse()
  const index = selected ? layers.indexOf(selected) : -1

  return (
    <div>
      <PanelTitle hint={area ? `Zona: ${area.label}. El elemento de arriba queda por encima de los demás.` : undefined}>Capas</PanelTitle>

      {ordered.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink bg-paper p-4 text-center text-sm text-ink-soft">
          Aún no hay nada en esta zona. Sube una imagen, escribe un texto o elige una pegatina.
        </p>
      ) : (
        <ul className="grid gap-2" aria-label="Elementos de la zona, de arriba abajo">
          {ordered.map((l) => {
            const on = l.id === selectedId
            const out = area ? layerOutside(l, area) : false
            const over = area ? layerOverflows(l, area) : false
            return (
              <li key={l.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => store().select(l.id)}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-ink px-3 py-2 text-left transition-colors',
                    on ? 'bg-pink shadow-pop-sm' : 'bg-paper hover:bg-yellow-soft',
                  )}
                >
                  <Thumb layer={l} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{layerName(l)}</span>
                    <span className="block text-xs">
                      {l.type === 'text' ? 'Texto' : l.type === 'image' ? 'Imagen' : 'Pegatina'}
                      {out ? ' · fuera de la zona' : over ? ' · sobresale' : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected && area && (
        <div className="mt-5 rounded-3xl border-2 border-ink bg-paper p-3.5">
          <h3 className="mb-3 truncate font-display text-lg">{layerName(selected)}</h3>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <ActionButton icon={MoveUp} onClick={() => store().reorder(selected.id, 1)} disabled={index >= layers.length - 1}>
              Traer delante
            </ActionButton>
            <ActionButton icon={MoveDown} onClick={() => store().reorder(selected.id, -1)} disabled={index <= 0}>
              Enviar atrás
            </ActionButton>
            <ActionButton icon={Copy} onClick={() => store().duplicate(selected.id)}>Duplicar</ActionButton>
            <ActionButton icon={FlipHorizontal2} onClick={() => store().flip(selected.id)}>Voltear</ActionButton>
            <ActionButton icon={AlignHorizontalJustifyCenter} onClick={() => store().center(selected.id, 'h')}>Centrar ↔</ActionButton>
            <ActionButton icon={AlignVerticalJustifyCenter} onClick={() => store().center(selected.id, 'v')}>Centrar ↕</ActionButton>
            <ActionButton icon={Maximize2} onClick={() => store().fitWidth(selected.id)}>Ajustar al ancho</ActionButton>
            <ActionButton icon={Trash2} onClick={() => store().remove(selected.id)}>Eliminar</ActionButton>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Ancho"
              unit="cm"
              value={selected.width}
              min={0.5}
              max={300}
              onCommit={(n) => store().setLayerWidth(selected.id, n)}
              hint="Mantiene la proporción"
            />
            <NumberField
              label="Rotación"
              unit="grados"
              value={selected.rotation}
              min={-180}
              max={180}
              step={1}
              decimals={0}
              onCommit={(n) => store().patchLayer(selected.id, { rotation: n }, `rot-${selected.id}`)}
            />
            <NumberField
              label="Posición X"
              unit="cm"
              value={selected.x}
              min={-90}
              max={190}
              onCommit={(n) => store().patchLayer(selected.id, { x: n }, `x-${selected.id}`)}
            />
            <NumberField
              label="Posición Y"
              unit="cm"
              value={selected.y}
              min={-90}
              max={190}
              onCommit={(n) => store().patchLayer(selected.id, { y: n }, `y-${selected.id}`)}
            />
          </div>
          <p className="field-hint">X e Y indican el centro del elemento, medido desde la esquina superior izquierda de la zona.</p>

          {selected.type === 'image' && (
            <Group className="mt-3 !mb-0">
              <ResolutionHint layer={selected} image={images[selected.fileId]} />
            </Group>
          )}
        </div>
      )}
    </div>
  )
}
