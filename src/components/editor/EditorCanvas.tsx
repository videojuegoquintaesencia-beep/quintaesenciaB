'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Image as KImage, Layer as KLayer, Line, Rect, Stage, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { getColor, getProduct, getView, isDarkSurface, type PrintArea } from '@/config/products'
import { formatNumber } from '@/lib/format'
import { MIN_LAYER_CM } from '@/lib/editor/constants'
import { areaOrigin, snapToArea } from '@/lib/editor/geometry'
import { useEditor } from '@/lib/editor/store'
import { LayerShape } from './LayerShape'
import { useMockupImage, type ImageMap } from './useImages'

const INK = '#1b1340'
const VIOLET = '#7b5cff'
const PINK = '#ff4f9a'
const PAPER = '#ffffff'

function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

/** Lienzo de Konva: mockup del producto, zonas de estampado y capas editables. */
export function EditorCanvas({ images }: { images: ImageMap }) {
  const productId = useEditor((s) => s.productId)
  const design = useEditor((s) => s.design)
  const viewId = useEditor((s) => s.viewId)
  const areaId = useEditor((s) => s.areaId)
  const selectedId = useEditor((s) => s.selectedId)
  useEditor((s) => s.fontsVersion)

  const product = getProduct(productId)
  const view = product ? getView(product, viewId) : undefined
  const color = product ? getColor(product, design.colorId) : undefined
  const mockup = useMockupImage(productId, viewId, color?.hex ?? '#ffffff')
  const dark = product ? isDarkSurface(product, design.colorId) : false
  const coarse = useIsCoarsePointer()

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
  const gesture = useRef<string | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const deselect = useCallback((e: Konva.KonvaEventObject<Event>) => {
    if (e.target === e.target.getStage()) useEditor.getState().select(null)
  }, [])

  if (!product || !view) return null

  const scale = box.w > 0 && box.h > 0 ? Math.min(box.w / view.viewBox.width, box.h / view.viewBox.height) : 1
  const offsetX = (box.w - view.viewBox.width * scale) / 2
  const offsetY = (box.h - view.viewBox.height * scale) / 2
  const ppc = view.pxPerCm
  const activeArea = view.areas.find((a) => a.id === areaId) ?? view.areas[0]
  const selectedLayer = design.areas[activeArea.id]?.layers.find((l) => l.id === selectedId)

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none select-none">
      {box.w > 0 && (
        <Stage ref={stageRef} width={box.w} height={box.h} onMouseDown={deselect} onTouchStart={deselect}>
          <KLayer>
            <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
              {mockup && <KImage image={mockup} width={view.viewBox.width} height={view.viewBox.height} listening={false} />}
              {view.areas.map((area) => (
                <AreaView
                  key={area.id}
                  area={area}
                  ppc={ppc}
                  scale={scale}
                  active={area.id === activeArea.id}
                  dark={dark}
                  images={images}
                  guides={guides}
                  setGuides={setGuides}
                  gesture={gesture}
                />
              ))}
            </Group>
            <SelectionTransformer
              stageRef={stageRef}
              selectedId={selectedId}
              minPx={MIN_LAYER_CM * ppc * scale}
              coarse={coarse}
              layerSignature={selectionSignature(selectedLayer)}
              boxPx={selectedLayer ? Math.min(selectedLayer.width, selectedLayer.height) * ppc * scale : 999}
            />
          </KLayer>
        </Stage>
      )}
    </div>
  )
}

function selectionSignature(layer: { x: number; y: number; width: number; height: number; rotation: number } | undefined) {
  return layer ? `${layer.x}|${layer.y}|${layer.width}|${layer.height}|${layer.rotation}` : ''
}

interface AreaViewProps {
  area: PrintArea
  ppc: number
  scale: number
  active: boolean
  /** Prenda oscura: guías y rótulos en claro con contorno oscuro para que se vean. */
  dark: boolean
  images: ImageMap
  guides: { x: number[]; y: number[] }
  setGuides: (g: { x: number[]; y: number[] }) => void
  gesture: React.MutableRefObject<string | null>
}

function AreaView({ area, ppc, scale, active, dark, images, guides, setGuides, gesture }: AreaViewProps) {
  const layers = useEditor((s) => s.design.areas[area.id]?.layers)
  const origin = useMemo(() => areaOrigin(area, ppc), [area, ppc])
  const w = area.widthCm * ppc
  const h = area.heightCm * ppc
  const clip = { clipX: 0, clipY: 0, clipWidth: w, clipHeight: h }
  const imageFor = (l: { type: string; fileId?: string }) => {
    if (l.type !== 'image' || !l.fileId) return null
    const state = images[l.fileId]
    return state && state !== 'error' ? state : null
  }

  const onSelectArea = () => useEditor.getState().setArea(area.id)
  const labelSize = 12 / scale
  const label = `${formatNumber(area.widthCm)} × ${formatNumber(area.heightCm)} cm`

  const dragHandlers = (id: string) => ({
    onSelect: () => useEditor.getState().select(id),
    onOpenText: () => useEditor.getState().requestTextFocus(),
    onDragStart: () => {
      gesture.current = useEditor.getState().beginGesture()
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target
      const store = useEditor.getState()
      const layer = store.design.areas[area.id]?.layers.find((l) => l.id === id)
      if (!layer) return
      const snap = snapToArea({ ...layer, x: node.x() / ppc, y: node.y() / ppc }, area)
      node.position({ x: snap.x * ppc, y: snap.y * ppc })
      setGuides({ x: snap.guideX, y: snap.guideY })
      store.patchLayer(id, { x: snap.x, y: snap.y }, gesture.current ?? undefined)
    },
    onDragEnd: () => {
      setGuides({ x: [], y: [] })
      useEditor.getState().endGesture()
    },
    onTransformStart: () => {
      gesture.current = useEditor.getState().beginGesture()
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scale({ x: 1, y: 1 })
      useEditor.getState().applyTransform(
        id,
        { x: node.x() / ppc, y: node.y() / ppc, rotation: node.rotation(), scaleX, scaleY },
        gesture.current ?? undefined,
      )
      useEditor.getState().endGesture()
    },
  })

  return (
    <Group x={origin.x} y={origin.y}>
      {!active && (
        <>
          <Group opacity={0.4} listening={false} {...clip}>
            {layers?.map((l) => <LayerShape key={l.id} layer={l} ppc={ppc} image={imageFor(l)} />)}
          </Group>
          <Rect width={w} height={h} fill="rgba(0,0,0,0)" onClick={onSelectArea} onTap={onSelectArea} />
        </>
      )}
      {active && (
        <>
          {/* Capa completa y atenuada: deja ver (y arrastrar) lo que sobresale de la zona. */}
          <Group opacity={0.3}>
            {layers?.map((l) => (
              <LayerShape key={l.id} layer={l} ppc={ppc} image={imageFor(l)} interactive {...dragHandlers(l.id)} />
            ))}
          </Group>
          {/* Copia recortada a la zona: lo único que se imprime. No escucha eventos. */}
          <Group listening={false} {...clip}>
            {layers?.map((l) => <LayerShape key={l.id} layer={l} ppc={ppc} image={imageFor(l)} />)}
          </Group>
        </>
      )}
      {dark && (
        <Rect width={w} height={h} stroke={INK} strokeWidth={active ? 4 : 3} opacity={0.55} dash={[8, 6]} strokeScaleEnabled={false} listening={false} />
      )}
      <Rect
        width={w}
        height={h}
        stroke={dark ? PAPER : active ? INK : 'rgba(27,19,64,0.45)'}
        strokeWidth={active ? 2 : 1.5}
        opacity={dark && !active ? 0.75 : 1}
        dash={[8, 6]}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Text
        x={0}
        y={-labelSize - 6 / scale}
        text={label}
        fontSize={labelSize}
        fontFamily='"Nunito Variable", "Nunito", sans-serif'
        fontStyle="bold"
        fill={dark ? PAPER : active ? INK : 'rgba(27,19,64,0.55)'}
        opacity={dark && !active ? 0.8 : 1}
        {...(dark ? { stroke: INK, strokeWidth: 3 / scale, fillAfterStrokeEnabled: true, lineJoin: 'round' as const } : {})}
        listening={false}
      />
      {active && guides.x.map((gx) => <Line key={`gx${gx}`} points={[gx * ppc, -8, gx * ppc, h + 8]} stroke={PINK} strokeWidth={1.5} strokeScaleEnabled={false} dash={[6, 4]} listening={false} />)}
      {active && guides.y.map((gy) => <Line key={`gy${gy}`} points={[-8, gy * ppc, w + 8, gy * ppc]} stroke={PINK} strokeWidth={1.5} strokeScaleEnabled={false} dash={[6, 4]} listening={false} />)}
    </Group>
  )
}

interface TransformerProps {
  stageRef: React.RefObject<Konva.Stage | null>
  selectedId: string | null
  minPx: number
  coarse: boolean
  /** Cambia cuando cambia la geometría de la capa seleccionada, para repintar los tiradores. */
  layerSignature: string
  /** Lado menor (px en pantalla) de la capa seleccionada: con capas pequeñas los tiradores se achican. */
  boxPx: number
}

function SelectionTransformer({ stageRef, selectedId, minPx, coarse, layerSignature, boxPx }: TransformerProps) {
  const anchor = Math.round(Math.max(9, Math.min(coarse ? 22 : 14, boxPx / 2.6)))
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const node = selectedId ? stage.findOne(`#ly-${selectedId}`) : undefined
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [stageRef, selectedId, layerSignature])

  return (
    <Transformer
      ref={trRef}
      keepRatio
      rotateEnabled
      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
      anchorSize={anchor}
      anchorCornerRadius={coarse ? anchor / 2 : 4}
      anchorStroke={INK}
      anchorStrokeWidth={2}
      anchorFill="#ffc93c"
      borderStroke={VIOLET}
      borderStrokeWidth={2}
      borderDash={[6, 4]}
      rotateAnchorOffset={coarse ? 40 : 30}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={5}
      ignoreStroke
      boundBoxFunc={(oldBox, newBox) => (newBox.width < minPx || newBox.height < minPx ? oldBox : newBox)}
    />
  )
}
