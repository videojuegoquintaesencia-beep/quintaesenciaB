'use client'
import { Copy, FlipHorizontal2, Redo2, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useEditor } from '@/lib/editor/store'
import { IconButton } from './ui'

export function Toolbar({ onStartOver }: { onStartOver: () => void }) {
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const selectedId = useEditor((s) => s.selectedId)
  const hasLayers = useEditor((s) => Object.values(s.design.areas).some((a) => a.layers.length > 0))
  const store = useEditor.getState

  return (
    <div role="toolbar" aria-label="Herramientas del lienzo" className="flex items-center gap-1.5 px-3 py-1.5 sm:gap-2">
      <IconButton icon={Undo2} label="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={() => store().undo()} />
      <IconButton icon={Redo2} label="Rehacer (Ctrl+Mayús+Z)" disabled={!canRedo} onClick={() => store().redo()} />
      <span aria-hidden="true" className="mx-1 h-6 w-0.5 bg-ink/20" />
      <IconButton icon={Copy} label="Duplicar (Ctrl+D)" disabled={!selectedId} onClick={() => selectedId && store().duplicate(selectedId)} />
      <IconButton icon={FlipHorizontal2} label="Voltear horizontalmente" disabled={!selectedId} onClick={() => selectedId && store().flip(selectedId)} />
      <IconButton icon={Trash2} label="Eliminar (Supr)" disabled={!selectedId} onClick={() => selectedId && store().remove(selectedId)} />
      <button
        type="button"
        onClick={onStartOver}
        disabled={!hasLayers}
        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3 text-sm font-extrabold hover:bg-yellow-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper lg:min-h-10"
      >
        <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2.5} />
        <span className="max-sm:sr-only">Empezar de nuevo</span>
      </button>
    </div>
  )
}
