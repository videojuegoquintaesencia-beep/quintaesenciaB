'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Plus, Trash2 } from 'lucide-react'
import { FONTS, FONT_IDS, type FontId, type TextLayer } from '@/lib/design'
import { cn } from '@/lib/cn'
import { FONT_CAPS, ensureFont } from '@/lib/editor/fonts'
import { useEditor } from '@/lib/editor/store'
import { formatNumber } from '@/lib/format'
import { ActionButton, ColorSwatches, Group, IconButton, NumberField, PanelTitle } from '../ui'

const ALIGNS = [
  { id: 'left', label: 'Alinear a la izquierda', icon: AlignLeft },
  { id: 'center', label: 'Centrar', icon: AlignCenter },
  { id: 'right', label: 'Alinear a la derecha', icon: AlignRight },
] as const

export function TextPanel() {
  const layer = useEditor((s) => {
    const l = s.design.areas[s.areaId]?.layers.find((x) => x.id === s.selectedId)
    return l?.type === 'text' ? l : null
  })
  return (
    <div>
      <PanelTitle hint="Escribe lo que quieras: un nombre, una frase, el nombre de tu equipo…">Texto</PanelTitle>
      {layer ? (
        <TextEditor key={layer.id} layer={layer} />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-ink bg-paper p-5 text-center">
          <p className="mb-3 font-bold">Añade un texto y edítalo aquí</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              useEditor.getState().addText()
              useEditor.getState().requestTextFocus()
            }}
          >
            <Plus aria-hidden="true" className="size-4" /> Añadir texto
          </button>
          <p className="mt-3 text-sm text-ink-soft">También puedes tocar dos veces un texto del lienzo para editarlo.</p>
        </div>
      )}
    </div>
  )
}

function TextEditor({ layer }: { layer: TextLayer }) {
  const store = useEditor.getState
  const textId = useId()
  const fontId = useId()
  const strokeId = useId()
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const focusText = useEditor((s) => s.focusText)
  // Borrador del campo mientras se escribe (puede estar vacío aunque la capa conserve su último texto válido).
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? layer.text
  const [fontError, setFontError] = useState(false)
  const caps = FONT_CAPS[layer.font]

  // Doble toque sobre el texto del lienzo, o recién añadido: enfocar y seleccionar el contenido.
  useEffect(() => {
    if (!focusText) return
    const el = areaRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.select()
    store().consumeTextFocus()
  }, [focusText, store])

  const patch = (p: Partial<TextLayer>, key?: string) => store().patchLayer(layer.id, p, key)

  const changeFont = async (font: FontId) => {
    setFontError(false)
    const ok = await ensureFont(font, layer.text)
    if (!ok) setFontError(true)
    patch({ font })
    store().bumpFonts()
  }

  const outline = layer.strokeCm ?? 0

  return (
    <div>
      <Group>
        <div className="mb-1 flex items-baseline justify-between">
          <label htmlFor={textId} className="label !mb-0">Contenido</label>
          <span className="text-xs tabular-nums text-ink-soft" aria-hidden="true">{value.length}/200</span>
        </div>
        <textarea
          id={textId}
          ref={areaRef}
          className="textarea !min-h-24"
          rows={3}
          maxLength={200}
          value={value}
          onChange={(e) => {
            setDraft(e.target.value)
            if (e.target.value.trim()) patch({ text: e.target.value }, `text-${layer.id}`)
          }}
          onBlur={() => setDraft(null)}
        />
        <p className="field-hint">Pulsa Intro para añadir otra línea.</p>
      </Group>

      <Group>
        <label htmlFor={fontId} className="label">Tipografía</label>
        <select id={fontId} className="select !min-h-11" value={layer.font} onChange={(e) => changeFont(e.target.value as FontId)}>
          {FONT_IDS.map((f) => (
            <option key={f} value={f}>{FONTS[f].label}</option>
          ))}
        </select>
        {fontError && <p className="field-error" role="alert">No se ha podido cargar la tipografía. Se usa una de repuesto.</p>}
      </Group>

      <Group className="grid grid-cols-2 gap-3">
        <NumberField
          label="Tamaño"
          unit="cm"
          value={layer.sizeCm}
          min={0.3}
          max={80}
          step={0.1}
          onCommit={(n) => patch({ sizeCm: n }, `size-${layer.id}`)}
        />
        <div>
          <span className="label !text-sm">Estilo</span>
          <div className="flex gap-2">
            <IconButton
              icon={Bold}
              label="Negrita"
              pressed={!!layer.bold && caps.bold}
              disabled={!caps.bold}
              title={caps.bold ? 'Negrita' : 'Esta tipografía ya es contundente: no tiene negrita'}
              onClick={() => patch({ bold: !layer.bold })}
            />
            <IconButton
              icon={Italic}
              label="Cursiva"
              pressed={!!layer.italic && caps.italic}
              disabled={!caps.italic}
              title={caps.italic ? 'Cursiva' : 'Esta tipografía no tiene cursiva'}
              onClick={() => patch({ italic: !layer.italic })}
            />
          </div>
        </div>
      </Group>

      <Group title="Alineación (varias líneas)">
        <div role="group" aria-label="Alineación del texto" className="flex gap-2">
          {ALIGNS.map((a) => (
            <IconButton key={a.id} icon={a.icon} label={a.label} pressed={layer.align === a.id} onClick={() => patch({ align: a.id })} />
          ))}
        </div>
      </Group>

      <Group title="Color del texto">
        <ColorSwatches label="Color del texto" value={layer.fill} onChange={(fill) => patch({ fill }, `fill-${layer.id}`)} />
      </Group>

      <Group title="Contorno">
        <label htmlFor={strokeId} className="label !text-sm">
          Grosor: <span className="font-semibold text-ink-soft">{outline > 0 ? `${formatNumber(outline)} cm` : 'sin contorno'}</span>
        </label>
        <input
          id={strokeId}
          type="range"
          min={0}
          max={1.5}
          step={0.05}
          value={outline}
          onChange={(e) => patch({ strokeCm: Number(e.target.value) }, `stroke-${layer.id}`)}
          className="mb-3 h-11 w-full accent-pink"
        />
        <div className={cn(outline === 0 && 'pointer-events-none opacity-40')} aria-hidden={outline === 0}>
          <ColorSwatches
            label="Color del contorno"
            value={layer.strokeColor ?? '#1b1340'}
            onChange={(strokeColor) => patch({ strokeColor }, `strokec-${layer.id}`)}
            allowCustom={outline > 0}
          />
        </div>
      </Group>

      <div className="flex flex-wrap gap-2">
        <ActionButton icon={Plus} onClick={() => store().addText()}>Añadir otro texto</ActionButton>
        <ActionButton icon={Trash2} onClick={() => store().remove(layer.id)}>Eliminar</ActionButton>
      </div>
    </div>
  )
}
