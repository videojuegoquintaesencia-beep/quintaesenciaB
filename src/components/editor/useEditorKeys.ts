'use client'
import { useEffect } from 'react'
import { NUDGE_BIG_CM, NUDGE_CM } from '@/lib/editor/constants'
import { useEditor } from '@/lib/editor/store'

function isTextTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
}

/** Atajos de teclado del editor. No actúan mientras se escribe en un campo. */
export function useEditorKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextTarget(e.target) || document.querySelector('dialog[open]')) return
      const store = useEditor.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        store.redo()
        return
      }
      if (!store.selectedId) return
      const target = e.target as HTMLElement
      // Las flechas sobre botones, pestañas o listas conservan su función propia.
      const onCanvasOrBody = target === document.body || !!target.closest('[data-editor-canvas]')

      if (mod && key === 'd') {
        e.preventDefault()
        store.duplicate(store.selectedId)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && onCanvasOrBody) {
        e.preventDefault()
        store.remove(store.selectedId)
      } else if (e.key === 'Escape') {
        store.select(null)
      } else if (onCanvasOrBody && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? NUDGE_BIG_CM : NUDGE_CM
        store.nudge(e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
