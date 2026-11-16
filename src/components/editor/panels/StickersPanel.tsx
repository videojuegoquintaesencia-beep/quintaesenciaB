'use client'
import { STICKERS } from '@/lib/stickers'
import { useEditor } from '@/lib/editor/store'
import { ColorSwatches, Group, PanelTitle } from '../ui'

export function StickersPanel() {
  const selected = useEditor((s) => {
    const l = s.design.areas[s.areaId]?.layers.find((x) => x.id === s.selectedId)
    return l?.type === 'sticker' ? l : null
  })

  return (
    <div>
      <PanelTitle hint="Toca una pegatina para añadirla en el centro de la zona. Puedes cambiarle el color.">Pegatinas</PanelTitle>

      {selected && (
        <Group title="Color de la pegatina seleccionada">
          <ColorSwatches
            label="Color de la pegatina"
            value={selected.fill ?? '#1b1340'}
            onChange={(fill) => useEditor.getState().patchLayer(selected.id, { fill }, `fill-${selected.id}`)}
          />
        </Group>
      )}

      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4" aria-label="Biblioteca de pegatinas">
        {STICKERS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => useEditor.getState().addSticker(s.id)}
              aria-label={`Añadir pegatina: ${s.name}`}
              title={s.name}
              className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-ink bg-paper p-2.5 transition-transform hover:-translate-y-0.5 hover:bg-yellow-soft hover:shadow-pop-sm"
            >
              <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full">
                <path d={s.path} fill={s.defaultFill} stroke="#1b1340" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
