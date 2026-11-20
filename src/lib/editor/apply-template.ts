'use client'
/**
 * Flujo de «aplicar una plantilla» del editor, separado del store principal para no engordarlo:
 * si la zona activa ya tiene elementos se pide confirmación (sustituir / añadir encima); si está vacía
 * se aplica directamente. La aplicación es un único paso de historial.
 */
import { create } from 'zustand'
import { getArea, getProduct } from '@/config/products'
import { templateFonts, type Template } from '@/lib/templates'
import { ensureFont } from './fonts'
import { useEditor } from './store'
import { measureText } from './text'

export type ApplyMode = 'replace' | 'add'

interface TemplateFlowState {
  /** Plantilla a la espera de que el cliente decida qué hacer con lo que ya hay en la zona. */
  pending: Template | null
  /** Punto de entrada: decide entre preguntar o aplicar. */
  request: (template: Template) => void
  apply: (template: Template, mode: ApplyMode) => Promise<void>
  cancel: () => void
}

export const useTemplateFlow = create<TemplateFlowState>()((set, get) => ({
  pending: null,

  request: (template) => {
    const s = useEditor.getState()
    const occupied = (s.design.areas[s.areaId]?.layers.length ?? 0) > 0
    if (occupied) set({ pending: template })
    else void get().apply(template, 'replace')
  },

  cancel: () => set({ pending: null }),

  apply: async (template, mode) => {
    set({ pending: null })
    // Las tipografías tienen que estar cargadas antes de medir los textos; si no, el ancho sería el de la fuente de repuesto.
    await Promise.all(templateFonts(template).map((font) => ensureFont(font)))
    const editor = useEditor.getState()
    if (!editor.ready) return
    const product = getProduct(editor.productId)
    const area = product && getArea(product, editor.areaId)
    if (!product || !area) return

    const layers = template.build(product, editor.design.colorId, area, measureText)
    const editable = layers.find((l) => l.type === 'text')
    editor.applyLayers({ areaId: area.id, layers, mode, selectId: editable?.id ?? null })
    editor.bumpFonts()
    editor.announce(
      `Plantilla «${template.name}» ${mode === 'add' ? 'añadida encima de tu diseño' : 'aplicada'} en la zona ${area.label}. Cambia el texto de ejemplo por el tuyo.`,
    )
    // Se abre la pestaña Texto con el campo enfocado para que el cliente escriba lo suyo en el acto.
    if (editable) editor.requestTextFocus()
  },
}))
