'use client'
import { Group, Image as KImage, Path, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import type { Layer } from '@/lib/design'
import type { LoadedImage } from '@/lib/editor/images'
import { layerSpec } from '@/lib/editor/nodes'

interface Props {
  layer: Layer
  ppc: number
  image: LoadedImage | null | undefined
  /** Interactiva: se puede seleccionar, arrastrar y transformar. Si no, es solo dibujo. */
  interactive?: boolean
  onSelect?: () => void
  onOpenText?: () => void
  onDragStart?: () => void
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd?: () => void
  onTransformStart?: () => void
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void
}

/** Una capa del diseño como grupo de Konva centrado en su punto (x, y). */
export function LayerShape({ layer, ppc, image, interactive, onSelect, onOpenText, ...handlers }: Props) {
  const spec = layerSpec(layer, ppc, image)
  const { shape } = spec
  return (
    <Group
      id={interactive ? `ly-${layer.id}` : undefined}
      {...spec.group}
      listening={!!interactive}
      draggable={!!interactive}
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      onDblClick={layer.type === 'text' ? onOpenText : undefined}
      onDblTap={layer.type === 'text' ? onOpenText : undefined}
      onMouseEnter={(e) => {
        const c = e.target.getStage()?.container()
        if (c && interactive) c.style.cursor = 'move'
      }}
      onMouseLeave={(e) => {
        const c = e.target.getStage()?.container()
        if (c) c.style.cursor = ''
      }}
      onDragStart={handlers.onDragStart}
      onDragMove={handlers.onDragMove}
      onDragEnd={handlers.onDragEnd}
      onTransformStart={handlers.onTransformStart}
      onTransformEnd={handlers.onTransformEnd}
    >
      {interactive && <Rect {...spec.box} fill="rgba(0,0,0,0)" />}
      <Group scaleX={spec.flipX ? -1 : 1}>
        {shape.kind === 'image' && <KImage {...shape.config} />}
        {shape.kind === 'text' && <Text {...shape.config} />}
        {shape.kind === 'path' && <Path {...shape.config} />}
        {shape.kind === 'missing' && <Rect {...shape.config} />}
      </Group>
    </Group>
  )
}
