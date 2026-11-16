/**
 * Descripción geométrica de una capa en píxeles. La usan tanto el lienzo interactivo (react-konva)
 * como la exportación (nodos Konva sin pantalla), para que lo que ves sea exactamente lo que se imprime.
 *
 * Cada capa es un grupo centrado en su punto (x, y); sus hijos se colocan relativos a ese centro.
 */
import Konva from 'konva'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { PathConfig } from 'konva/lib/shapes/Path'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { TextConfig } from 'konva/lib/shapes/Text'
import type { Layer } from '@/lib/design'
import { getSticker } from '@/lib/stickers'
import type { LoadedImage } from './images'
import { textConfig } from './text'

export type ShapeSpec =
  | { kind: 'image'; config: ImageConfig }
  | { kind: 'text'; config: TextConfig }
  | { kind: 'path'; config: PathConfig }
  | { kind: 'missing'; config: RectConfig }

export interface LayerSpec {
  group: { x: number; y: number; rotation: number; opacity: number }
  flipX: boolean
  /** Caja de la capa relativa a su centro (zona de selección). */
  box: { x: number; y: number; width: number; height: number }
  shape: ShapeSpec
}

export type ImageVariant = 'display' | 'full'

export function layerSpec(
  layer: Layer,
  ppc: number,
  image: LoadedImage | null | undefined,
  variant: ImageVariant = 'display',
): LayerSpec {
  const w = layer.width * ppc
  const h = layer.height * ppc
  const box = { x: -w / 2, y: -h / 2, width: w, height: h }
  const group = { x: layer.x * ppc, y: layer.y * ppc, rotation: layer.rotation, opacity: layer.opacity ?? 1 }
  const flipX = !!layer.flipX

  if (layer.type === 'image') {
    if (!image) {
      return {
        group,
        flipX,
        box,
        shape: { kind: 'missing', config: { ...box, fill: '#ece8f8', stroke: '#4a4270', strokeWidth: 2, dash: [8, 6] } },
      }
    }
    const source = variant === 'full' ? image.full : image.display
    return { group, flipX, box, shape: { kind: 'image', config: { ...box, image: source } } }
  }

  if (layer.type === 'text') {
    return { group, flipX, box, shape: { kind: 'text', config: { ...textConfig(layer, ppc), ...box } } }
  }

  const sticker = getSticker(layer.stickerId)
  return {
    group,
    flipX,
    box,
    shape: {
      kind: 'path',
      config: {
        data: sticker?.path ?? '',
        x: box.x,
        y: box.y,
        scaleX: w / 100,
        scaleY: h / 100,
        fill: layer.fill ?? sticker?.defaultFill ?? '#1b1340',
      },
    },
  }
}

/** Crea el nodo Konva de una capa para exportar (sin zona de selección). */
export function buildLayerNode(layer: Layer, ppc: number, image: LoadedImage | null | undefined): Konva.Group {
  const spec = layerSpec(layer, ppc, image, 'full')
  const group = new Konva.Group({ ...spec.group, listening: false })
  const content = new Konva.Group({ scaleX: spec.flipX ? -1 : 1 })
  const { shape } = spec
  if (shape.kind === 'image') content.add(new Konva.Image(shape.config))
  else if (shape.kind === 'text') content.add(new Konva.Text(shape.config))
  else if (shape.kind === 'path') content.add(new Konva.Path(shape.config))
  else content.add(new Konva.Rect(shape.config))
  group.add(content)
  return group
}
