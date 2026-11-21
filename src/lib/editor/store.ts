'use client'
/**
 * Estado del editor (independiente del carrito). Las capas viven en `design`; el historial guarda
 * instantáneas inmutables del diseño completo, así que deshacer/rehacer es barato.
 */
import { create } from 'zustand'
import { getArea, getProduct, getView, isDarkSurface, isSingleSize, type PrintArea, type Product, type ProductId } from '@/config/products'
import { layerBounds, emptyDesign, type Design, type ImageLayer, type Layer, type StickerLayer, type TextLayer } from '@/lib/design'
import { newId } from '@/lib/ids'
import { getSticker } from '@/lib/stickers'
import { MAX_HISTORY, MIN_LAYER_CM } from './constants'
import { clamp, fitSize, round2 } from './geometry'
import { measureText, withMeasure } from './text'

export type EditorTab = 'producto' | 'plantillas' | 'subir' | 'texto' | 'pegatinas' | 'capas' | 'resumen'

interface EditorState {
  ready: boolean
  productId: ProductId
  design: Design
  viewId: string
  areaId: string
  selectedId: string | null
  sizes: Record<string, number>
  /** Línea del carrito que se está editando. */
  editLineId: string | null
  past: Design[]
  future: Design[]
  /** Los cambios con la misma clave seguidos en el tiempo (arrastrar, teclear) forman un único paso de historial. */
  commitKey: string | null
  commitAt: number
  announcement: string
  /** Se incrementa al terminar de cargar una tipografía para repintar el lienzo. */
  fontsVersion: number
  tab: EditorTab
  /** Pide enfocar el campo de texto del panel Texto (doble toque en un texto o recién añadido). */
  focusText: boolean

  init: (input: { productId: ProductId; design: Design; sizes: Record<string, number>; editLineId?: string | null }) => void
  announce: (message: string) => void
  setTab: (tab: EditorTab) => void
  requestTextFocus: () => void
  consumeTextFocus: () => void
  bumpFonts: () => void
  select: (id: string | null) => void
  setColor: (colorId: string) => void
  setView: (viewId: string) => void
  setArea: (areaId: string) => void
  beginGesture: () => string
  endGesture: () => void
  addImage: (input: { fileId: string; name: string; naturalWidth: number; naturalHeight: number }) => string | null
  addText: () => string | null
  addSticker: (stickerId: string) => string | null
  /**
   * Coloca varias capas de golpe en una zona (plantillas) como UN solo paso de historial: `replace` quita
   * antes lo que hubiera en esa zona, `add` las apila encima. Activa la zona y selecciona `selectId`.
   */
  applyLayers: (input: { areaId: string; layers: Layer[]; mode: 'replace' | 'add'; selectId: string | null }) => void
  patchLayer: (id: string, patch: Partial<Layer>, key?: string) => void
  setLayerWidth: (id: string, widthCm: number) => void
  applyTransform: (id: string, t: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }, key?: string) => void
  duplicate: (id: string) => void
  remove: (id: string) => void
  reorder: (id: string, dir: 1 | -1) => void
  flip: (id: string) => void
  center: (id: string, axis: 'h' | 'v') => void
  fitWidth: (id: string) => void
  nudge: (dx: number, dy: number) => void
  setQty: (sizeId: string, qty: number) => void
  undo: () => void
  redo: () => void
  startOver: () => void
  remeasureAll: () => void
}

const TEXT_MEASURE_KEYS: (keyof TextLayer)[] = ['text', 'font', 'sizeCm', 'strokeCm', 'bold', 'italic']

function productOf(id: ProductId): Product {
  return getProduct(id) as Product
}

function clampLayer<T extends Layer>(layer: T): T {
  const next = {
    ...layer,
    x: round2(clamp(layer.x, -90, 190)),
    y: round2(clamp(layer.y, -90, 190)),
    width: round2(clamp(layer.width, 0.2, 300)),
    height: round2(clamp(layer.height, 0.2, 300)),
    rotation: round2(((((layer.rotation + 180) % 360) + 360) % 360) - 180),
  }
  if (next.type === 'text') {
    next.sizeCm = round2(clamp(next.sizeCm, 0.3, 80))
    if (next.strokeCm !== undefined) next.strokeCm = round2(clamp(next.strokeCm, 0, 6))
  }
  return next
}

function mapLayers(design: Design, areaId: string, fn: (layers: Layer[]) => Layer[]): Design {
  const layers = fn(design.areas[areaId]?.layers ?? [])
  return { ...design, areas: { ...design.areas, [areaId]: { layers } } }
}

function findLayer(state: Pick<EditorState, 'design' | 'areaId'>, id: string): Layer | undefined {
  return state.design.areas[state.areaId]?.layers.find((l) => l.id === id)
}

function activeArea(state: Pick<EditorState, 'productId' | 'areaId'>): PrintArea {
  return getArea(productOf(state.productId), state.areaId) as PrintArea
}

function defaultSizes(product: Product): Record<string, number> {
  return isSingleSize(product) ? { [product.sizes[0].id]: 1 } : { M: 1 }
}

export const useEditor = create<EditorState>()((set, get) => {
  /** Aplica un nuevo diseño añadiéndolo al historial (o fusionándolo con el paso anterior si comparten clave). */
  const commit = (next: Design, key?: string, extra: Partial<EditorState> = {}) => {
    const s = get()
    const now = Date.now()
    const merge = !!key && s.commitKey === key && (key.startsWith('gesture-') || now - s.commitAt < 1500)
    set({
      design: next,
      past: merge ? s.past : [...s.past, s.design].slice(-MAX_HISTORY),
      future: [],
      commitKey: key ?? null,
      commitAt: now,
      ...extra,
    })
  }

  const insertLayer = (layer: Layer, message: string): string => {
    const s = get()
    commit(mapLayers(s.design, s.areaId, (ls) => [...ls, layer]), undefined, { selectedId: layer.id })
    get().announce(message)
    return layer.id
  }

  const baseLayer = (area: PrintArea, width: number, height: number) => ({
    id: newId(10),
    x: round2(area.widthCm / 2),
    y: round2(area.heightCm / 2),
    width,
    height,
    rotation: 0,
  })

  return {
    ready: false,
    productId: 'camiseta',
    design: emptyDesign('camiseta', ''),
    viewId: '',
    areaId: '',
    selectedId: null,
    sizes: {},
    editLineId: null,
    past: [],
    future: [],
    commitKey: null,
    commitAt: 0,
    announcement: '',
    fontsVersion: 0,
    tab: 'producto',
    focusText: false,

    init: ({ productId, design, sizes, editLineId = null }) => {
      const product = productOf(productId)
      const view = product.views[0]
      set({
        ready: true,
        productId,
        design,
        viewId: view.id,
        areaId: view.areas[0].id,
        selectedId: null,
        sizes: Object.keys(sizes).length ? sizes : defaultSizes(product),
        editLineId,
        past: [],
        future: [],
        commitKey: null,
        announcement: '',
        tab: 'producto',
      })
    },

    announce: (message) => set({ announcement: message }),
    setTab: (tab) => set({ tab }),
    requestTextFocus: () => set({ tab: 'texto', focusText: true }),
    consumeTextFocus: () => set({ focusText: false }),
    bumpFonts: () => set((s) => ({ fontsVersion: s.fontsVersion + 1 })),
    select: (id) => set({ selectedId: id }),

    setColor: (colorId) => {
      const s = get()
      if (s.design.colorId === colorId) return
      commit({ ...s.design, colorId })
    },

    setView: (viewId) => {
      const s = get()
      const view = getView(productOf(s.productId), viewId)
      if (!view) return
      set({ viewId, areaId: view.areas[0].id, selectedId: null })
      get().announce(`Vista: ${view.label}. Zona: ${view.areas[0].label}.`)
    },

    setArea: (areaId) => {
      const s = get()
      const area = getArea(productOf(s.productId), areaId)
      if (!area) return
      set({ viewId: area.viewId, areaId, selectedId: null })
      get().announce(`Zona de estampado: ${area.label}, hasta ${area.widthCm} por ${area.heightCm} cm.`)
    },

    beginGesture: () => {
      const key = `gesture-${newId(6)}`
      set({ commitKey: null })
      return key
    },
    endGesture: () => set({ commitKey: null }),

    addImage: ({ fileId, name, naturalWidth, naturalHeight }) => {
      const area = activeArea(get())
      const { width, height } = fitSize(naturalWidth, naturalHeight, area)
      const layer: ImageLayer = { ...baseLayer(area, width, height), type: 'image', fileId, name, naturalWidth, naturalHeight }
      return insertLayer(layer, `Imagen añadida: ${name}.`)
    },

    addText: () => {
      const area = activeArea(get())
      const sizeCm = round2(Math.max(0.6, Math.min(area.widthCm, area.heightCm) * 0.2))
      let layer: TextLayer = {
        ...baseLayer(area, 1, 1),
        type: 'text',
        text: 'Tu texto',
        font: 'fredoka',
        sizeCm,
        // En prendas oscuras el texto nuevo nace blanco: en tinta oscura sería invisible.
        fill: isDarkSurface(productOf(get().productId), get().design.colorId) ? '#ffffff' : '#1b1340',
        align: 'center',
        bold: true,
      }
      layer = withMeasure(layer)
      // Si no cabe en la zona, se reduce hasta ocupar como mucho el 85 % del ancho.
      if (layer.width > area.widthCm * 0.85) {
        layer = withMeasure({ ...layer, sizeCm: round2(layer.sizeCm * ((area.widthCm * 0.85) / layer.width)) })
      }
      return insertLayer(clampLayer(layer), 'Texto añadido.')
    },

    addSticker: (stickerId) => {
      const sticker = getSticker(stickerId)
      if (!sticker) return null
      const area = activeArea(get())
      const side = round2(Math.min(area.widthCm, area.heightCm) * 0.45)
      const layer: StickerLayer = { ...baseLayer(area, side, side), type: 'sticker', stickerId, fill: sticker.defaultFill }
      return insertLayer(layer, `Pegatina añadida: ${sticker.name}.`)
    },

    applyLayers: ({ areaId, layers, mode, selectId }) => {
      const s = get()
      const area = getArea(productOf(s.productId), areaId)
      if (!area || layers.length === 0) return
      const incoming = layers.map((l) => clampLayer(l))
      commit(mapLayers(s.design, areaId, (ls) => (mode === 'replace' ? incoming : [...ls, ...incoming])), undefined, {
        viewId: area.viewId,
        areaId,
        selectedId: incoming.some((l) => l.id === selectId) ? selectId : null,
      })
    },

    patchLayer: (id, patch, key) => {
      const s = get()
      const current = findLayer(s, id)
      if (!current) return
      let next = { ...current, ...patch } as Layer
      if (next.type === 'text' && TEXT_MEASURE_KEYS.some((k) => k in patch)) {
        next = withMeasure(clampLayer(next) as TextLayer)
      }
      next = clampLayer(next)
      commit(mapLayers(s.design, s.areaId, (ls) => ls.map((l) => (l.id === id ? next : l))), key ?? `patch-${id}-${Object.keys(patch).join(',')}`)
    },

    setLayerWidth: (id, widthCm) => {
      const s = get()
      const layer = findLayer(s, id)
      if (!layer || !Number.isFinite(widthCm)) return
      const w = clamp(widthCm, MIN_LAYER_CM, 300)
      const ratio = w / layer.width
      if (layer.type === 'text') {
        get().patchLayer(id, { sizeCm: layer.sizeCm * ratio }, `width-${id}`)
      } else {
        get().patchLayer(id, { width: w, height: layer.height * ratio }, `width-${id}`)
      }
    },

    applyTransform: (id, t, key) => {
      const s = get()
      const layer = findLayer(s, id)
      if (!layer) return
      let next: Layer
      if (layer.type === 'text') {
        const scale = (Math.abs(t.scaleX) + Math.abs(t.scaleY)) / 2
        next = withMeasure(clampLayer({ ...layer, sizeCm: layer.sizeCm * scale }))
        next = { ...next, x: t.x, y: t.y, rotation: t.rotation }
      } else {
        next = { ...layer, x: t.x, y: t.y, rotation: t.rotation, width: layer.width * Math.abs(t.scaleX), height: layer.height * Math.abs(t.scaleY) }
      }
      next = clampLayer(next)
      commit(mapLayers(s.design, s.areaId, (ls) => ls.map((l) => (l.id === id ? next : l))), key)
    },

    duplicate: (id) => {
      const s = get()
      const layer = findLayer(s, id)
      if (!layer) return
      const copy = clampLayer({ ...layer, id: newId(10), x: layer.x + 0.8, y: layer.y + 0.8 })
      commit(mapLayers(s.design, s.areaId, (ls) => [...ls, copy]), undefined, { selectedId: copy.id })
      get().announce('Elemento duplicado.')
    },

    remove: (id) => {
      const s = get()
      if (!findLayer(s, id)) return
      commit(mapLayers(s.design, s.areaId, (ls) => ls.filter((l) => l.id !== id)), undefined, {
        selectedId: s.selectedId === id ? null : s.selectedId,
      })
      get().announce('Elemento eliminado.')
    },

    reorder: (id, dir) => {
      const s = get()
      const layers = s.design.areas[s.areaId]?.layers ?? []
      const i = layers.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= layers.length) return
      commit(
        mapLayers(s.design, s.areaId, (ls) => {
          const copy = [...ls]
          ;[copy[i], copy[j]] = [copy[j], copy[i]]
          return copy
        }),
      )
      get().announce(dir > 0 ? 'Elemento traído hacia delante.' : 'Elemento enviado hacia atrás.')
    },

    flip: (id) => {
      const layer = findLayer(get(), id)
      if (layer) get().patchLayer(id, { flipX: !layer.flipX }, `flip-${id}-${Date.now()}`)
    },

    center: (id, axis) => {
      const area = activeArea(get())
      get().patchLayer(id, axis === 'h' ? { x: area.widthCm / 2 } : { y: area.heightCm / 2 }, `center-${id}-${axis}-${Date.now()}`)
      get().announce(axis === 'h' ? 'Centrado horizontalmente.' : 'Centrado verticalmente.')
    },

    fitWidth: (id) => {
      const s = get()
      const layer = findLayer(s, id)
      if (!layer) return
      const area = activeArea(s)
      const b = layerBounds(layer)
      const ratio = area.widthCm / (b.x1 - b.x0)
      if (layer.type === 'text') {
        get().patchLayer(id, { sizeCm: layer.sizeCm * ratio, x: area.widthCm / 2 }, `fit-${id}-${Date.now()}`)
      } else {
        get().patchLayer(id, { width: layer.width * ratio, height: layer.height * ratio, x: area.widthCm / 2 }, `fit-${id}-${Date.now()}`)
      }
      get().announce('Ajustado al ancho de la zona.')
    },

    nudge: (dx, dy) => {
      const s = get()
      const layer = s.selectedId ? findLayer(s, s.selectedId) : undefined
      if (layer) get().patchLayer(layer.id, { x: layer.x + dx, y: layer.y + dy }, `nudge-${layer.id}`)
    },

    setQty: (sizeId, qty) => {
      const s = get()
      const product = productOf(s.productId)
      const others = Object.entries(s.sizes).reduce((n, [id, q]) => (id === sizeId ? n : n + q), 0)
      const value = clamp(Math.floor(qty) || 0, 0, Math.max(0, product.maxQtyPerLine - others))
      const sizes = { ...s.sizes, [sizeId]: value }
      if (value === 0) delete sizes[sizeId]
      set({ sizes })
    },

    undo: () => {
      const s = get()
      const prev = s.past[s.past.length - 1]
      if (!prev) return
      set({
        design: prev,
        past: s.past.slice(0, -1),
        future: [s.design, ...s.future].slice(0, MAX_HISTORY),
        commitKey: null,
        selectedId: prev.areas[s.areaId]?.layers.some((l) => l.id === s.selectedId) ? s.selectedId : null,
      })
      get().announce('Cambio deshecho.')
    },

    redo: () => {
      const s = get()
      const next = s.future[0]
      if (!next) return
      set({
        design: next,
        past: [...s.past, s.design].slice(-MAX_HISTORY),
        future: s.future.slice(1),
        commitKey: null,
        selectedId: next.areas[s.areaId]?.layers.some((l) => l.id === s.selectedId) ? s.selectedId : null,
      })
      get().announce('Cambio rehecho.')
    },

    startOver: () => {
      const s = get()
      commit({ ...s.design, areas: {} }, undefined, { selectedId: null })
      get().announce('Diseño reiniciado. Puedes deshacerlo con el botón Deshacer.')
    },

    remeasureAll: () => {
      const s = get()
      const areas: Design['areas'] = {}
      let changed = false
      for (const [areaId, data] of Object.entries(s.design.areas)) {
        areas[areaId] = {
          layers: data.layers.map((l) => {
            if (l.type !== 'text') return l
            const m = measureText(l)
            if (Math.abs(m.width - l.width) < 0.005 && Math.abs(m.height - l.height) < 0.005) return l
            changed = true
            return { ...l, ...m }
          }),
        }
      }
      if (changed) set({ design: { ...s.design, areas } })
    },
  }
})
