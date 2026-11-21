/**
 * Catálogo de plantillas de diseño del personalizador.
 *
 * Código puro (sin React ni Konva): lo usan el editor (pestaña «Plantillas» y `?plantilla=`) y la ficha
 * de producto (miniaturas estáticas en SVG, también en el servidor).
 *
 * Cada plantilla describe su composición en una caja normalizada (0-1) con dos variantes: `portrait` para
 * zonas verticales (frente de camiseta y sudadera) y `landscape` para zonas apaisadas (frontal de la gorra,
 * envolvente de la taza). `build()` encaja esa caja en la zona real, mide los textos con la función que se
 * le pase (`measureText` de Konva en el editor; `approxMeasure` fuera de él) y devuelve capas listas para el
 * diseño: centradas, a escala y sin salirse del área imprimible.
 *
 * Colores: `'auto'` es tinta oscura sobre prendas claras y blanca sobre oscuras (`isDarkSurface`);
 * `'inverse'` es lo contrario (útil para contornos). Un color fijo que no contraste con la prenda recibe
 * un contorno automático (textos) o pasa a `'auto'` (pegatinas), así la plantilla se ve en cualquier color.
 *
 * Para añadir una plantilla: copia una entrada de `TEMPLATES`, cambia id (único), nombre, ocasión, productos y
 * las dos composiciones. Las pegatinas son las de `src/lib/stickers.ts` y las fuentes las de `FONTS`.
 */
import { luminance } from '@/components/mockups/color'
import { getColor, isDarkSurface, type PrintArea, type Product, type ProductId } from '@/config/products'
import type { FontId, Layer, StickerLayer, TextLayer } from '@/lib/design'
import { PALETTE } from '@/lib/editor/constants'
import { round2 } from '@/lib/editor/geometry'
import { newId } from '@/lib/ids'
import { getSticker } from '@/lib/stickers'

/* ───────────── Tipos públicos ───────────── */

export type TemplateOccasion = 'cumpleanos' | 'despedida' | 'equipo' | 'evento' | 'regalo' | 'humor' | 'familia'

export const TEMPLATE_OCCASIONS: readonly { id: TemplateOccasion; label: string }[] = [
  { id: 'cumpleanos', label: 'Cumpleaños' },
  { id: 'despedida', label: 'Despedida de soltero/a' },
  { id: 'equipo', label: 'Equipo o empresa' },
  { id: 'evento', label: 'Evento o fiesta' },
  { id: 'regalo', label: 'Regalo' },
  { id: 'humor', label: 'Humor' },
  { id: 'familia', label: 'Familia y bebé' },
]

export function occasionLabel(id: TemplateOccasion): string {
  return TEMPLATE_OCCASIONS.find((o) => o.id === id)?.label ?? id
}

/** Mide una capa de texto (ancho y alto en cm, con contorno y margen), igual que `measureText` del editor. */
export type MeasureText = (layer: TextLayer) => { width: number; height: number }

/** Color de un elemento: según la prenda (`auto`/`inverse`) o un hex fijo de la paleta. */
export type TemplateColor = 'auto' | 'inverse' | `#${string}`

export interface TemplateTextItem {
  kind: 'text'
  text: string
  font: FontId
  /** Centro del texto, en fracciones de la caja de composición. */
  x: number
  y: number
  /** Caja máxima (fracciones de la caja): el texto se escala hasta ocuparla sin pasarse ni de ancho ni de alto. */
  w: number
  h: number
  fill: TemplateColor
  stroke?: TemplateColor
  /** Grosor del contorno como fracción del tamaño de fuente (0,07 = 7 %). */
  strokeWidth?: number
  bold?: boolean
  italic?: boolean
  align?: TextLayer['align']
  rotation?: number
  /** Texto de ejemplo pensado para que el cliente lo cambie («TU NOMBRE»): queda seleccionado al aplicar la plantilla. */
  editable?: boolean
}

export interface TemplateStickerItem {
  kind: 'sticker'
  stickerId: string
  x: number
  y: number
  /** Lado de la pegatina como fracción del lado menor de la caja. */
  size: number
  fill?: TemplateColor
  rotation?: number
  flipX?: boolean
}

export type TemplateItem = TemplateTextItem | TemplateStickerItem

export interface TemplateLayout {
  /** Proporción ancho/alto de la caja de composición. */
  aspect: number
  /** Elementos de abajo arriba (el último queda encima). */
  items: TemplateItem[]
}

export interface Template {
  id: string
  name: string
  occasion: TemplateOccasion
  products: ProductId[] | 'all'
  layouts: { portrait: TemplateLayout; landscape?: TemplateLayout }
  /**
   * Capas de la plantilla para una zona concreta. La primera capa de texto es siempre la editable
   * (el editor la selecciona y abre el campo de texto). `measure` mide los textos: en el editor es
   * `measureText` (Konva); si no se pasa, se usa la aproximación `approxMeasure`.
   */
  build: (product: Product, colorId: string, area: PrintArea, measure?: MeasureText) => Layer[]
}

/* ───────────── Colores ───────────── */

const hexOf = (name: string): `#${string}` => {
  const entry = PALETTE.find((p) => p.name === name)
  if (!entry) throw new Error(`Color de paleta desconocido: ${name}`)
  return entry.hex as `#${string}`
}

const INK = hexOf('Tinta')
const WHITE = hexOf('Blanco')
const PINK = hexOf('Rosa')
const ORANGE = hexOf('Naranja')
const YELLOW = hexOf('Amarillo')
const TEAL = hexOf('Turquesa')
const SKY = hexOf('Celeste')
const VIOLET = hexOf('Violeta')

/** Relación de contraste WCAG entre dos colores hex. */
function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Por debajo de este contraste con la prenda, el elemento recibe un contorno (texto) o cambia de color (pegatina). */
const MIN_CONTRAST = 2
/** Grosor del contorno que se añade a los textos que no contrastan, como fracción del tamaño de fuente. */
const AUTO_STROKE = 0.07

/* ───────────── Construcción de capas ───────────── */

/** Fracción de la zona que ocupa la caja de composición: deja un margen para que nada roce el borde. */
const BOX_FILL = 0.86
/** Las zonas más anchas que altas en esta proporción usan la composición apaisada. */
const LANDSCAPE_FROM = 1.4
/** Tamaño de referencia (cm) con el que se mide cada texto antes de escalarlo: todo crece en proporción. */
const PROBE_CM = 10

interface Surface {
  hex: string
  auto: `#${string}`
  inverse: `#${string}`
}

function surfaceOf(product: Product, colorId: string): Surface {
  const color = getColor(product, colorId) ?? product.colors[0]
  const dark = isDarkSurface(product, color.id)
  // En las tazas el cuerpo es siempre blanco: el color elegido solo tiñe el interior y el asa.
  const hex = product.id === 'taza' ? WHITE : color.hex
  return { hex, auto: dark ? WHITE : INK, inverse: dark ? INK : WHITE }
}

function resolveColor(token: TemplateColor, surface: Surface): `#${string}` {
  if (token === 'auto') return surface.auto
  if (token === 'inverse') return surface.inverse
  return token
}

interface Box {
  x0: number
  y0: number
  width: number
  height: number
}

/** Caja de composición: la más grande con la proporción pedida que cabe en el 86 % de la zona, centrada. */
function fitBox(area: PrintArea, aspect: number): Box {
  const maxW = area.widthCm * BOX_FILL
  const maxH = area.heightCm * BOX_FILL
  const width = Math.min(maxW, maxH * aspect)
  const height = width / aspect
  return { x0: (area.widthCm - width) / 2, y0: (area.heightCm - height) / 2, width, height }
}

function buildText(item: TemplateTextItem, box: Box, surface: Surface, measure: MeasureText): TextLayer {
  const fill = resolveColor(item.fill, surface)
  let stroke = item.stroke ? resolveColor(item.stroke, surface) : undefined
  let strokeWidth = item.stroke ? (item.strokeWidth ?? AUTO_STROKE) : 0
  // Un color fijo que se confunde con la prenda (amarillo sobre amarillo) se perfila con la tinta de contraste.
  if (!stroke && contrast(fill, surface.hex) < MIN_CONTRAST) {
    stroke = surface.auto
    strokeWidth = AUTO_STROKE
  }
  const base = {
    id: newId(10),
    type: 'text' as const,
    text: item.text,
    font: item.font,
    fill,
    strokeColor: stroke,
    align: item.align ?? ('center' as const),
    bold: item.bold,
    italic: item.italic,
    rotation: item.rotation ?? 0,
    x: round2(box.x0 + item.x * box.width),
    y: round2(box.y0 + item.y * box.height),
  }
  const probe = measure({ ...base, width: 1, height: 1, sizeCm: PROBE_CM, strokeCm: strokeWidth * PROBE_CM })
  const targetW = item.w * box.width
  const targetH = item.h * box.height
  const sizeCm = round2(Math.min(80, Math.max(0.3, PROBE_CM * Math.min(targetW / probe.width, targetH / probe.height))))
  const sized = { ...base, width: 1, height: 1, sizeCm, strokeCm: strokeWidth > 0 ? round2(strokeWidth * sizeCm) : undefined }
  const { width, height } = measure({ ...sized, strokeCm: sized.strokeCm ?? 0 })
  return { ...sized, width, height }
}

function buildSticker(item: TemplateStickerItem, box: Box, surface: Surface): StickerLayer {
  const sticker = getSticker(item.stickerId)
  if (!sticker) throw new Error(`Pegatina desconocida en una plantilla: ${item.stickerId}`)
  let fill = item.fill ? resolveColor(item.fill, surface) : sticker.defaultFill
  // Una pegatina del color de la prenda desaparecería: pasa a la tinta de contraste.
  if (contrast(fill, surface.hex) < MIN_CONTRAST) fill = surface.auto
  const side = round2(item.size * Math.min(box.width, box.height))
  return {
    id: newId(10),
    type: 'sticker',
    stickerId: item.stickerId,
    fill,
    x: round2(box.x0 + item.x * box.width),
    y: round2(box.y0 + item.y * box.height),
    width: side,
    height: side,
    rotation: item.rotation ?? 0,
    flipX: item.flipX,
  }
}

/** Composición que corresponde a una zona según su proporción. */
export function layoutFor(template: Template, area: Pick<PrintArea, 'widthCm' | 'heightCm'>): TemplateLayout {
  const wide = area.widthCm / area.heightCm >= LANDSCAPE_FROM
  return (wide && template.layouts.landscape) || template.layouts.portrait
}

function buildLayers(template: Template, product: Product, colorId: string, area: PrintArea, measure: MeasureText): Layer[] {
  const layout = layoutFor(template, area)
  const box = fitBox(area, layout.aspect)
  const surface = surfaceOf(product, colorId)
  const layers = layout.items.map((item) => (item.kind === 'text' ? buildText(item, box, surface, measure) : buildSticker(item, box, surface)))
  // La capa editable pasa a ser la primera de texto (el editor selecciona «la primera capa de texto»); como los
  // textos no se solapan entre sí, el orden de apilado no cambia nada visible.
  const editableAt = layout.items.findIndex((item) => item.kind === 'text' && item.editable)
  const firstTextAt = layout.items.findIndex((item) => item.kind === 'text')
  if (editableAt > firstTextAt && firstTextAt >= 0) {
    const [editable] = layers.splice(editableAt, 1)
    layers.splice(firstTextAt, 0, editable)
  }
  return layers
}

/* ───────────── Medición aproximada (sin Konva) ───────────── */

/**
 * Anchura media de un carácter (en «em») de cada tipografía, medida con las fuentes reales sobre los textos de
 * las plantillas (mayúsculas en las de palo; frases en minúscula en las caligráficas).
 */
const APPROX_EM: Record<FontId, number> = {
  fredoka: 0.56,
  nunito: 0.6,
  anton: 0.43,
  bangers: 0.38,
  pacifico: 0.49,
  'permanent-marker': 0.46,
  caveat: 0.37,
  lobster: 0.43,
  'bebas-neue': 0.35,
}

/** Altura de línea de Konva.Text en el editor (`LINE_HEIGHT` de src/lib/editor/text.ts). */
export const TEXT_LINE_HEIGHT = 1.12
/** Margen interior proporcional al tamaño de fuente (`padding` de `textConfig`). */
export const TEXT_PADDING = 0.07

/** Ancho aproximado (cm) de una línea de texto, sin margen ni contorno. */
export function approxLineWidth(line: string, font: FontId, sizeCm: number, bold?: boolean): number {
  return line.length * APPROX_EM[font] * sizeCm * (bold ? 1.04 : 1)
}

/**
 * Medición aproximada de un texto, para dibujar plantillas donde no hay Konva (ficha de producto). Imita la
 * geometría de `textConfig`: líneas a 1,12 de altura y un margen de 7 % del tamaño más el contorno.
 */
export const approxMeasure: MeasureText = (layer) => {
  const lines = layer.text.split('\n')
  const padding = TEXT_PADDING * layer.sizeCm + (layer.strokeCm ?? 0)
  const width = Math.max(...lines.map((l) => approxLineWidth(l, layer.font, layer.sizeCm, layer.bold))) + padding * 2
  const height = lines.length * TEXT_LINE_HEIGHT * layer.sizeCm + padding * 2
  return { width: round2(width), height: round2(height) }
}

/* ───────────── Ayudas para describir composiciones ───────────── */

interface LineDef {
  text: string
  font: FontId
  fill?: TemplateColor
  stroke?: TemplateColor
  /** Altura relativa respecto a las demás líneas (1 = normal). */
  weight?: number
  /** Ancho máximo como fracción del ancho disponible. */
  w?: number
  bold?: boolean
  italic?: boolean
  rotation?: number
  editable?: boolean
}

interface Frame {
  /** Centro horizontal (0,5 por defecto) y ancho disponible (1 por defecto). */
  x?: number
  w?: number
  /** Franja vertical que ocupan las líneas. */
  y0?: number
  y1?: number
  /** Separación entre líneas, en unidades de peso. */
  gap?: number
}

/** Reparte líneas de texto en vertical: cada una recibe una altura proporcional a su peso. */
function stack(defs: LineDef[], frame: Frame = {}): TemplateTextItem[] {
  const { x = 0.5, w = 1, y0 = 0, y1 = 1, gap = 0.12 } = frame
  const total = defs.reduce((n, d) => n + (d.weight ?? 1), 0) + gap * (defs.length - 1)
  const unit = (y1 - y0) / total
  let cursor = y0
  return defs.map((d) => {
    const h = (d.weight ?? 1) * unit
    const item: TemplateTextItem = {
      kind: 'text',
      text: d.text,
      font: d.font,
      x,
      y: cursor + h / 2,
      w: w * (d.w ?? 1),
      h,
      fill: d.fill ?? 'auto',
      stroke: d.stroke,
      bold: d.bold,
      italic: d.italic,
      rotation: d.rotation,
      editable: d.editable,
    }
    cursor += h + gap * unit
    return item
  })
}

function sticker(stickerId: string, x: number, y: number, size: number, extra: Partial<Omit<TemplateStickerItem, 'kind' | 'stickerId' | 'x' | 'y' | 'size'>> = {}): TemplateStickerItem {
  return { kind: 'sticker', stickerId, x, y, size, ...extra }
}

/** Texto suelto con caja explícita (para composiciones que no son una simple pila de líneas). */
function text(def: LineDef & { x: number; y: number; w: number; h: number }): TemplateTextItem {
  return {
    kind: 'text',
    text: def.text,
    font: def.font,
    x: def.x,
    y: def.y,
    w: def.w,
    h: def.h,
    fill: def.fill ?? 'auto',
    stroke: def.stroke,
    bold: def.bold,
    italic: def.italic,
    rotation: def.rotation,
    editable: def.editable,
  }
}

type TemplateDef = Omit<Template, 'build'>

function define(def: TemplateDef): Template {
  const template: Template = {
    ...def,
    build: (product, colorId, area, measure = approxMeasure) => buildLayers(template, product, colorId, area, measure),
  }
  return template
}

/* ───────────── Catálogo ───────────── */

export const TEMPLATES: Template[] = [
  /* ── Cumpleaños ── */
  define({
    id: 'cumple-el-cumple-de',
    name: 'El cumple de…',
    occasion: 'cumpleanos',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corona', 0.5, 0.16, 0.34, { fill: YELLOW }),
          sticker('destello', 0.13, 0.4, 0.14, { fill: YELLOW, rotation: 15 }),
          sticker('destello', 0.87, 0.36, 0.11, { fill: YELLOW, rotation: -10 }),
          ...stack(
            [
              { text: 'EL CUMPLE DE', font: 'bebas-neue' },
              { text: 'TU NOMBRE', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.7, editable: true },
              { text: '¡A CELEBRAR!', font: 'nunito', bold: true, weight: 0.7, w: 0.7 },
            ],
            { y0: 0.37, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.1,
        items: [
          sticker('corona', 0.13, 0.5, 0.62, { fill: YELLOW }),
          ...stack(
            [
              { text: 'EL CUMPLE DE', font: 'bebas-neue', weight: 0.8 },
              { text: 'TU NOMBRE', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.5, editable: true },
            ],
            { x: 0.6, w: 0.72 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'cumple-nivel',
    name: 'Nivel desbloqueado',
    occasion: 'cumpleanos',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('rayo', 0.1, 0.5, 0.2, { fill: YELLOW, rotation: -12 }),
          sticker('rayo', 0.9, 0.5, 0.2, { fill: YELLOW, rotation: 12, flipX: true }),
          ...stack(
            [
              { text: 'NIVEL', font: 'bebas-neue' },
              { text: '30', font: 'anton', fill: YELLOW, stroke: 'auto', weight: 3.2, w: 0.7, editable: true },
              { text: 'DESBLOQUEADO', font: 'bebas-neue' },
            ],
            { y0: 0.04, y1: 0.96 },
          ),
        ],
      },
      landscape: {
        aspect: 2.1,
        items: [
          text({ text: '30', font: 'anton', fill: YELLOW, stroke: 'auto', x: 0.22, y: 0.5, w: 0.36, h: 0.92, editable: true }),
          sticker('rayo', 0.95, 0.18, 0.3, { fill: YELLOW, rotation: 15 }),
          ...stack(
            [
              { text: 'NIVEL', font: 'bebas-neue' },
              { text: 'DESBLOQUEADO', font: 'bebas-neue' },
            ],
            { x: 0.66, w: 0.56, y0: 0.08, y1: 0.92 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'cumple-edicion-limitada',
    name: 'Edición limitada',
    occasion: 'cumpleanos',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.95,
        items: [
          sticker('estrella', 0.5, 0.13, 0.22, { fill: YELLOW }),
          ...stack(
            [
              { text: 'EDICIÓN LIMITADA', font: 'bebas-neue', weight: 0.9 },
              { text: 'TU NOMBRE', font: 'anton', weight: 1.8, editable: true },
              { text: 'DESDE 1996', font: 'nunito', bold: true, fill: PINK, weight: 0.8, w: 0.7 },
            ],
            { y0: 0.3, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('estrella', 0.1, 0.5, 0.5, { fill: YELLOW }),
          ...stack(
            [
              { text: 'EDICIÓN LIMITADA', font: 'bebas-neue', weight: 0.7 },
              { text: 'TU NOMBRE', font: 'anton', weight: 1.5, editable: true },
              { text: 'DESDE 1996', font: 'nunito', bold: true, fill: PINK, weight: 0.7 },
            ],
            { x: 0.58, w: 0.74 },
          ),
        ],
      },
    },
  }),

  /* ── Despedida de soltero/a ── */
  define({
    id: 'despedida-team-novia',
    name: 'Team novia',
    occasion: 'despedida',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corazon', 0.5, 0.16, 0.3, { fill: PINK }),
          ...stack(
            [
              { text: 'TEAM', font: 'bebas-neue' },
              { text: 'Novia', font: 'lobster', fill: PINK, stroke: 'auto', weight: 2 },
              { text: 'TU NOMBRE', font: 'bebas-neue', weight: 0.9, editable: true },
            ],
            { y0: 0.36, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corazon', 0.11, 0.5, 0.56, { fill: PINK }),
          ...stack(
            [
              { text: 'TEAM', font: 'bebas-neue', weight: 0.8 },
              { text: 'Novia', font: 'lobster', fill: PINK, stroke: 'auto', weight: 1.6 },
              { text: 'TU NOMBRE', font: 'bebas-neue', weight: 0.7, editable: true },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'despedida-ultima-noche',
    name: 'Última noche de libertad',
    occasion: 'despedida',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('llama', 0.5, 0.15, 0.3, { fill: ORANGE }),
          ...stack(
            [
              { text: 'ÚLTIMA NOCHE', font: 'bangers', weight: 1.3 },
              { text: 'DE LIBERTAD', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.3 },
              { text: 'TU NOMBRE · 2026', font: 'nunito', bold: true, weight: 0.7, editable: true },
            ],
            { y0: 0.33, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('llama', 0.1, 0.5, 0.58, { fill: ORANGE }),
          ...stack(
            [
              { text: 'ÚLTIMA NOCHE', font: 'bangers' },
              { text: 'DE LIBERTAD', font: 'bangers', fill: PINK, stroke: 'auto' },
              { text: 'TU NOMBRE · 2026', font: 'nunito', bold: true, weight: 0.6, editable: true },
            ],
            { x: 0.58, w: 0.74 },
          ),
        ],
      },
    },
  }),

  /* ── Equipo o empresa ── */
  define({
    id: 'equipo-staff',
    name: 'Staff',
    occasion: 'equipo',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.95,
        items: [
          sticker('check', 0.5, 0.12, 0.18, { fill: TEAL }),
          ...stack(
            [
              { text: 'STAFF', font: 'anton', weight: 3 },
              { text: 'TU EMPRESA', font: 'bebas-neue', w: 0.8, editable: true },
            ],
            { y0: 0.26, y1: 0.96 },
          ),
        ],
      },
      landscape: {
        aspect: 2.3,
        items: [
          sticker('check', 0.12, 0.5, 0.5, { fill: TEAL }),
          text({ text: 'STAFF', font: 'anton', x: 0.6, y: 0.38, w: 0.7, h: 0.6 }),
          text({ text: 'TU EMPRESA', font: 'bebas-neue', x: 0.6, y: 0.84, w: 0.6, h: 0.26, editable: true }),
        ],
      },
    },
  }),
  define({
    id: 'equipo-dorsal',
    name: 'Dorsal de equipo',
    occasion: 'equipo',
    products: ['camiseta', 'hoodie'],
    layouts: {
      portrait: {
        aspect: 0.8,
        items: [
          ...stack(
            [
              { text: 'TU EQUIPO', font: 'bebas-neue', editable: true },
              { text: '10', font: 'anton', weight: 3.6, w: 0.75 },
              { text: 'TU NOMBRE', font: 'bebas-neue' },
            ],
            { y0: 0.02, y1: 0.98, gap: 0.08 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'equipo-voluntariado',
    name: 'Voluntariado',
    occasion: 'equipo',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corazon', 0.5, 0.15, 0.28, { fill: PINK }),
          ...stack(
            [
              { text: 'VOLUNTARIADO', font: 'anton', weight: 1.6 },
              { text: 'TU ASOCIACIÓN', font: 'nunito', bold: true, weight: 0.8, editable: true },
            ],
            { y0: 0.34, y1: 0.86 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corazon', 0.11, 0.5, 0.56, { fill: PINK }),
          ...stack(
            [
              { text: 'VOLUNTARIADO', font: 'anton', weight: 1.5 },
              { text: 'TU ASOCIACIÓN', font: 'nunito', bold: true, weight: 0.7, editable: true },
            ],
            { x: 0.6, w: 0.72, y0: 0.08, y1: 0.92 },
          ),
        ],
      },
    },
  }),

  /* ── Evento o fiesta ── */
  define({
    id: 'evento-festival',
    name: 'Festival',
    occasion: 'evento',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('sol', 0.5, 0.21, 0.4, { fill: ORANGE }),
          ...stack(
            [
              { text: 'TU FESTIVAL', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.6, editable: true },
              { text: 'VERANO 2026', font: 'bebas-neue', weight: 0.9 },
            ],
            { y0: 0.46, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.1,
        items: [
          sticker('sol', 0.13, 0.5, 0.66, { fill: ORANGE }),
          ...stack(
            [
              { text: 'TU FESTIVAL', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.5, editable: true },
              { text: 'VERANO 2026', font: 'bebas-neue', weight: 0.8 },
            ],
            { x: 0.6, w: 0.7, y0: 0.06, y1: 0.94 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'evento-promocion',
    name: 'Promoción 2026',
    occasion: 'evento',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('estrella', 0.13, 0.1, 0.14, { fill: YELLOW, rotation: -15 }),
          sticker('estrella', 0.87, 0.1, 0.14, { fill: YELLOW, rotation: 15 }),
          ...stack(
            [
              { text: 'PROMOCIÓN', font: 'bebas-neue' },
              { text: '2026', font: 'anton', fill: VIOLET, stroke: 'auto', weight: 3, editable: true },
              { text: 'TU CENTRO', font: 'nunito', bold: true, weight: 0.8 },
            ],
            { y0: 0.04, y1: 0.98 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          text({ text: '2026', font: 'anton', fill: VIOLET, stroke: 'auto', x: 0.27, y: 0.5, w: 0.5, h: 0.94, editable: true }),
          ...stack(
            [
              { text: 'PROMOCIÓN', font: 'bebas-neue' },
              { text: 'TU CENTRO', font: 'nunito', bold: true, weight: 0.7 },
            ],
            { x: 0.75, w: 0.42, y0: 0.14, y1: 0.86 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'evento-campeones',
    name: 'Campeones',
    occasion: 'evento',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corona', 0.5, 0.14, 0.3, { fill: YELLOW }),
          ...stack(
            [
              { text: 'CAMPEONES', font: 'anton', weight: 1.6 },
              { text: 'TU EQUIPO', font: 'bebas-neue', editable: true },
              { text: '2026', font: 'bangers', fill: YELLOW, stroke: 'auto', weight: 1.1, w: 0.5 },
            ],
            { y0: 0.33, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corona', 0.12, 0.5, 0.58, { fill: YELLOW }),
          ...stack(
            [
              { text: 'CAMPEONES', font: 'anton', weight: 1.4 },
              { text: 'TU EQUIPO · 2026', font: 'bebas-neue', weight: 0.8, editable: true },
            ],
            { x: 0.6, w: 0.72, y0: 0.08, y1: 0.92 },
          ),
        ],
      },
    },
  }),

  /* ── Regalo ── */
  define({
    id: 'regalo-la-mejor',
    name: 'La mejor del mundo',
    occasion: 'regalo',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corazon', 0.5, 0.9, 0.16, { fill: PINK }),
          ...stack(
            [
              { text: 'LA MEJOR', font: 'bebas-neue' },
              { text: 'Abuela', font: 'pacifico', fill: PINK, stroke: 'auto', weight: 1.9, editable: true },
              { text: 'DEL MUNDO', font: 'bebas-neue' },
            ],
            { y0: 0.04, y1: 0.78 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corazon', 0.11, 0.5, 0.54, { fill: PINK }),
          ...stack(
            [
              { text: 'LA MEJOR', font: 'bebas-neue', weight: 0.8 },
              { text: 'Abuela', font: 'pacifico', fill: PINK, stroke: 'auto', weight: 1.7, editable: true },
              { text: 'DEL MUNDO', font: 'bebas-neue', weight: 0.8 },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'regalo-hecho-con-amor',
    name: 'Hecho con amor',
    occasion: 'regalo',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corazon', 0.18, 0.17, 0.17, { fill: PINK, rotation: -15 }),
          sticker('corazon', 0.83, 0.13, 0.12, { fill: PINK, rotation: 12 }),
          ...stack(
            [
              { text: 'Hecho con amor', font: 'caveat', bold: true, weight: 1.3 },
              { text: 'PARA TU NOMBRE', font: 'bebas-neue', weight: 1.1, editable: true },
            ],
            { y0: 0.32, y1: 0.86 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corazon', 0.1, 0.44, 0.46, { fill: PINK, rotation: -12 }),
          sticker('corazon', 0.22, 0.78, 0.26, { fill: PINK, rotation: 14 }),
          ...stack(
            [
              { text: 'Hecho con amor', font: 'caveat', bold: true, weight: 1.3 },
              { text: 'PARA TU NOMBRE', font: 'bebas-neue', weight: 1, editable: true },
            ],
            { x: 0.62, w: 0.68, y0: 0.08, y1: 0.92 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'regalo-el-cafe-de',
    name: 'El café de…',
    occasion: 'regalo',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('taza', 0.5, 0.2, 0.36, { fill: PINK }),
          ...stack(
            [
              { text: 'EL CAFÉ DE', font: 'bebas-neue', weight: 0.9 },
              { text: 'TU NOMBRE', font: 'pacifico', fill: PINK, stroke: 'auto', weight: 1.6, editable: true },
              { text: '(no tocar)', font: 'caveat', bold: true, weight: 0.8 },
            ],
            { y0: 0.44, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.3,
        items: [
          sticker('taza', 0.12, 0.5, 0.62, { fill: PINK }),
          ...stack(
            [
              { text: 'EL CAFÉ DE', font: 'bebas-neue', weight: 0.8 },
              { text: 'TU NOMBRE', font: 'pacifico', fill: PINK, stroke: 'auto', weight: 1.5, editable: true },
              { text: '(no tocar)', font: 'caveat', bold: true, weight: 0.7 },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),

  /* ── Humor ── */
  define({
    id: 'humor-antes-del-cafe',
    name: 'Antes del café, no',
    occasion: 'humor',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('luna', 0.84, 0.12, 0.18, { fill: VIOLET, rotation: 20 }),
          ...stack(
            [
              { text: 'NO ME HABLES', font: 'anton', weight: 1.3 },
              { text: 'ANTES DEL CAFÉ', font: 'anton', weight: 1.3 },
              { text: 'firmado: TU NOMBRE', font: 'caveat', bold: true, weight: 0.8, editable: true },
            ],
            { y0: 0.22, y1: 0.9 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('luna', 0.1, 0.5, 0.5, { fill: VIOLET, rotation: 20 }),
          ...stack(
            [
              { text: 'NO ME HABLES', font: 'anton' },
              { text: 'ANTES DEL CAFÉ', font: 'anton' },
              { text: 'firmado: TU NOMBRE', font: 'caveat', bold: true, weight: 0.65, editable: true },
            ],
            { x: 0.58, w: 0.74 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'humor-aqui-manda',
    name: 'Aquí manda…',
    occasion: 'humor',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corona', 0.5, 0.14, 0.3, { fill: YELLOW }),
          ...stack(
            [
              { text: 'AQUÍ MANDA', font: 'bebas-neue' },
              { text: 'TU NOMBRE', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.9, editable: true },
              { text: '(y punto)', font: 'caveat', bold: true, weight: 0.7 },
            ],
            { y0: 0.32, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corona', 0.12, 0.5, 0.58, { fill: YELLOW }),
          ...stack(
            [
              { text: 'AQUÍ MANDA', font: 'bebas-neue', weight: 0.8 },
              { text: 'TU NOMBRE', font: 'bangers', fill: PINK, stroke: 'auto', weight: 1.6, editable: true },
              { text: '(y punto)', font: 'caveat', bold: true, weight: 0.6 },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'humor-profesional',
    name: 'Profesional de la siesta',
    occasion: 'humor',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('luna', 0.5, 0.15, 0.26, { fill: VIOLET }),
          ...stack(
            [
              { text: 'PROFESIONAL', font: 'bebas-neue' },
              { text: 'DE LA SIESTA', font: 'anton', fill: VIOLET, stroke: 'auto', weight: 1.5, editable: true },
              { text: 'desde siempre', font: 'caveat', bold: true, weight: 0.8 },
            ],
            { y0: 0.32, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('luna', 0.11, 0.5, 0.52, { fill: VIOLET }),
          ...stack(
            [
              { text: 'PROFESIONAL', font: 'bebas-neue', weight: 0.8 },
              { text: 'DE LA SIESTA', font: 'anton', fill: VIOLET, stroke: 'auto', weight: 1.4, editable: true },
              { text: 'desde siempre', font: 'caveat', bold: true, weight: 0.65 },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),

  /* ── Familia y bebé ── */
  define({
    id: 'familia-apellido',
    name: 'Familia…',
    occasion: 'familia',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('corazon', 0.5, 0.9, 0.14, { fill: PINK }),
          ...stack(
            [
              { text: 'FAMILIA', font: 'bebas-neue' },
              { text: 'TU APELLIDO', font: 'anton', weight: 1.7, editable: true },
              { text: 'DESDE 2026', font: 'nunito', bold: true, weight: 0.8 },
            ],
            { y0: 0.08, y1: 0.78 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('corazon', 0.11, 0.5, 0.54, { fill: PINK }),
          ...stack(
            [
              { text: 'FAMILIA', font: 'bebas-neue', weight: 0.8 },
              { text: 'TU APELLIDO', font: 'anton', weight: 1.5, editable: true },
              { text: 'DESDE 2026', font: 'nunito', bold: true, weight: 0.7 },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'familia-hola-mundo',
    name: 'Hola, mundo',
    occasion: 'familia',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('nube', 0.22, 0.15, 0.26, { fill: SKY }),
          sticker('sol', 0.79, 0.14, 0.24, { fill: YELLOW }),
          ...stack(
            [
              { text: '¡HOLA, MUNDO!', font: 'fredoka', bold: true, weight: 1.5 },
              { text: 'TU NOMBRE', font: 'fredoka', bold: true, fill: PINK, stroke: 'auto', weight: 1.4, editable: true },
              { text: '2026', font: 'nunito', bold: true, weight: 0.8, w: 0.4 },
            ],
            { y0: 0.34, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('nube', 0.1, 0.5, 0.5, { fill: SKY }),
          sticker('sol', 0.9, 0.5, 0.5, { fill: YELLOW }),
          ...stack(
            [
              { text: '¡HOLA, MUNDO!', font: 'fredoka', bold: true, weight: 1.2 },
              { text: 'TU NOMBRE', font: 'fredoka', bold: true, fill: PINK, stroke: 'auto', weight: 1.2, editable: true },
            ],
            { x: 0.5, w: 0.56, y0: 0.08, y1: 0.92 },
          ),
        ],
      },
    },
  }),
  define({
    id: 'familia-super',
    name: 'Súper mamá',
    occasion: 'familia',
    products: 'all',
    layouts: {
      portrait: {
        aspect: 0.9,
        items: [
          sticker('rayo', 0.5, 0.14, 0.3, { fill: YELLOW }),
          ...stack(
            [
              { text: 'SÚPER', font: 'bangers', weight: 1.2 },
              { text: 'MAMÁ', font: 'anton', fill: PINK, stroke: 'auto', weight: 2, editable: true },
              { text: 'a tiempo completo', font: 'caveat', bold: true, weight: 0.8 },
            ],
            { y0: 0.32, y1: 1 },
          ),
        ],
      },
      landscape: {
        aspect: 2.2,
        items: [
          sticker('rayo', 0.11, 0.5, 0.56, { fill: YELLOW }),
          ...stack(
            [
              { text: 'SÚPER', font: 'bangers', weight: 0.9 },
              { text: 'MAMÁ', font: 'anton', fill: PINK, stroke: 'auto', weight: 1.6, editable: true },
              { text: 'a tiempo completo', font: 'caveat', bold: true, weight: 0.65 },
            ],
            { x: 0.6, w: 0.7 },
          ),
        ],
      },
    },
  }),
]

/** Plantillas destacadas en la ficha de cada producto (3-4 por producto, variadas en ocasión). */
export const FEATURED_TEMPLATES: Record<ProductId, string[]> = {
  camiseta: ['cumple-el-cumple-de', 'despedida-ultima-noche', 'evento-promocion', 'humor-aqui-manda'],
  hoodie: ['equipo-dorsal', 'familia-apellido', 'humor-antes-del-cafe', 'evento-campeones'],
  gorra: ['equipo-staff', 'evento-festival', 'cumple-nivel', 'familia-super'],
  taza: ['regalo-el-cafe-de', 'regalo-la-mejor', 'familia-hola-mundo', 'humor-profesional'],
}

/* ───────────── Consultas ───────────── */

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

export function getTemplate(id: string): Template | undefined {
  return BY_ID.get(id)
}

export function templateFits(template: Template, productId: ProductId): boolean {
  return template.products === 'all' || template.products.includes(productId)
}

export function templatesFor(productId: ProductId): Template[] {
  return TEMPLATES.filter((t) => templateFits(t, productId))
}

export function featuredTemplates(productId: ProductId): Template[] {
  return FEATURED_TEMPLATES[productId].map((id) => getTemplate(id)).filter((t): t is Template => !!t && templateFits(t, productId))
}

/** Zona principal del producto: la más grande de su primera vista (frente, frontal, envolvente). */
export function mainArea(product: Product): PrintArea & { viewId: string } {
  const view = product.views[0]
  const area = view.areas.reduce((a, b) => (a.widthCm * a.heightCm >= b.widthCm * b.heightCm ? a : b))
  return { ...area, viewId: view.id }
}

/** Tipografías que usa una plantilla (en cualquiera de sus composiciones), para cargarlas antes de dibujar. */
export function templateFonts(template: Template): FontId[] {
  const fonts = new Set<FontId>()
  for (const layout of [template.layouts.portrait, template.layouts.landscape]) {
    for (const item of layout?.items ?? []) if (item.kind === 'text') fonts.add(item.font)
  }
  return [...fonts]
}
