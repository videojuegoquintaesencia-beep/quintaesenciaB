'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers, ImagePlus, Receipt, Shirt, Smile, Type } from 'lucide-react'
import { getColor, getProduct, getView, type ProductId } from '@/config/products'
import { useCatalog } from '@/components/catalog/CatalogProvider'
import { emptyDesign, type Design } from '@/lib/design'
import { useCart } from '@/lib/cart-store'
import { catalogProduct } from '@/lib/settings-schema'
import { loadDraft, saveDraft } from '@/lib/editor/draft'
import { ensureFont } from '@/lib/editor/fonts'
import { useEditor, type EditorTab } from '@/lib/editor/store'
import { formatEUR, unidades } from '@/lib/format'
import { totalQuantity } from '@/lib/pricing'
import { cn } from '@/lib/cn'
import { CanvasNotices, EmptyCanvasHint } from './CanvasNotices'
import { CartDialog, ConfirmStartOver } from './Dialogs'
import { EditorCanvas } from './EditorCanvas'
import { LayersPanel } from './panels/LayersPanel'
import { ProductPanel } from './panels/ProductPanel'
import { StickersPanel } from './panels/StickersPanel'
import { BlockerMessage, BLOCKER_ID, CartButton, SummaryPanel } from './panels/SummaryPanel'
import { TextPanel } from './panels/TextPanel'
import { UploadPanel } from './panels/UploadPanel'
import { TabBar, type TabDef } from './TabBar'
import { Toolbar } from './Toolbar'
import { useAddToCart } from './useAddToCart'
import { useEditorKeys } from './useEditorKeys'
import { useDesignImages } from './useImages'
import { useLinePrice } from './useLinePrice'

/**
 * Disposición del estudio según el espacio disponible:
 * - stack: una columna (móvil en vertical y tablet estrecha), con barra de precio abajo.
 * - split: herramientas a la izquierda y lienzo a la derecha (portátiles estrechos, iPad apaisado y móvil apaisado).
 * - wide: tres columnas con el resumen del pedido siempre visible.
 */
type Layout = 'stack' | 'split' | 'wide'

const TABS: TabDef<EditorTab>[] = [
  { id: 'producto', label: 'Producto', icon: Shirt },
  { id: 'subir', label: 'Subir', icon: ImagePlus },
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'pegatinas', label: 'Pegatinas', icon: Smile },
  { id: 'capas', label: 'Capas', icon: Layers },
  { id: 'resumen', label: 'Resumen', icon: Receipt },
]

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Carga el diseño inicial: línea del carrito (edición), borrador guardado o diseño vacío. */
function useBootEditor(productId: ProductId, colorParam?: string, lineParam?: string) {
  const ready = useEditor((s) => s.ready && s.productId === productId)
  const started = useRef(false)
  // Tope de unidades por diseño del catálogo efectivo (editable en el panel). Se lee por ref para que un
  // refresco del catálogo no reinicie el editor.
  const catalog = useCatalog()
  const maxQtyRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    maxQtyRef.current = catalogProduct(catalog, productId)?.maxQtyPerLine
  }, [catalog, productId])

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    const product = getProduct(productId)
    if (!product) return
    const maxQtyPerLine = maxQtyRef.current
    const line = lineParam ? useCart.getState().lines.find((l) => l.id === lineParam && l.productId === productId) : undefined

    let design: Design
    let sizes: Record<string, number> = {}
    if (line) {
      design = line.design
      sizes = line.sizes
    } else {
      const draft = loadDraft(productId, maxQtyPerLine)
      design = draft?.design ?? emptyDesign(productId, product.colors[0].id)
      sizes = draft?.sizes ?? {}
      if (colorParam && getColor(product, colorParam)) design = { ...design, colorId: colorParam }
    }

    const fonts = new Set<Parameters<typeof ensureFont>[0]>()
    for (const area of Object.values(design.areas)) for (const l of area.layers) if (l.type === 'text') fonts.add(l.font)
    Promise.all([...fonts].map((f) => ensureFont(f))).then(() => {
      if (cancelled) return
      const store = useEditor.getState()
      store.init({ productId, design, sizes, editLineId: line?.id ?? null, maxQtyPerLine })
      store.remeasureAll()
    })
    return () => {
      // Al salir (o en el doble montaje de desarrollo) se descarta el arranque y se vuelve a empezar limpio.
      cancelled = true
      started.current = false
      useEditor.setState({ ready: false })
    }
  }, [productId, colorParam, lineParam])

  return ready
}

/** Guarda el borrador (diseño y cantidades) 600 ms después del último cambio. */
function useDraftAutosave(productId: ProductId, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const flush = () => {
      const s = useEditor.getState()
      if (s.ready && s.productId === productId) saveDraft(productId, { design: s.design, sizes: s.sizes })
    }
    const unsub = useEditor.subscribe((s, prev) => {
      if (s.design === prev.design && s.sizes === prev.sizes) return
      clearTimeout(timer)
      timer = setTimeout(flush, 600)
    })
    window.addEventListener('pagehide', flush)
    return () => {
      unsub()
      clearTimeout(timer)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [productId, enabled])
}

export default function Editor({ productId, colorParam, lineParam }: { productId: ProductId; colorParam?: string; lineParam?: string }) {
  const ready = useBootEditor(productId, colorParam, lineParam)
  const editLineId = useEditor((s) => s.editLineId)
  useDraftAutosave(productId, ready && !editLineId)
  useEditorKeys()

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-dots-soft p-6 text-center" role="status">
        <p className="rounded-2xl border-2 border-ink bg-paper px-5 py-3 font-display text-lg shadow-pop-sm">Preparando el lienzo…</p>
      </div>
    )
  }
  return <EditorShell productId={productId} />
}

function EditorShell({ productId }: { productId: ProductId }) {
  const product = getProduct(productId)!
  const tab = useEditor((s) => s.tab)
  const design = useEditor((s) => s.design)
  const viewId = useEditor((s) => s.viewId)
  const announcement = useEditor((s) => s.announcement)
  const editLineId = useEditor((s) => s.editLineId)
  const sizes = useEditor((s) => s.sizes)
  const layersCount = useEditor((s) => s.design.areas[s.areaId]?.layers.length ?? 0)
  const wide = useMediaQuery('(min-width: 1280px)')
  const split = useMediaQuery('(min-width: 1024px), (orientation: landscape) and (max-height: 520px)')
  const layout: Layout = wide ? 'wide' : split ? 'split' : 'stack'
  const images = useDesignImages(design)
  const price = useLinePrice()
  const cart = useAddToCart()
  const [confirmReset, setConfirmReset] = useState(false)

  const view = getView(product, viewId) ?? product.views[0]
  const blocker = price.ok ? null : price.error
  const qty = totalQuantity(sizes)
  const hasBrokenImage = Object.values(images).includes('error')
  const finalBlocker = blocker ?? (hasBrokenImage ? 'Hay una imagen que ya no está disponible. Elimínala o vuelve a subirla.' : null)

  const tabs = useMemo(
    () =>
      (wide ? TABS.filter((t) => t.id !== 'resumen') : TABS).map((t) => (t.id === 'capas' ? { ...t, badge: layersCount || undefined } : t)),
    [wide, layersCount],
  )
  const activeTab: EditorTab = wide && tab === 'resumen' ? 'producto' : tab
  const setTab = useEditor.getState().setTab

  const addLabel = editLineId ? 'Guardar cambios' : 'Añadir al carrito'
  const working = cart.state.phase === 'working'
  const addButton = (
    <>
      <CartButton label={addLabel} blocked={!!finalBlocker} working={working} onClick={cart.run} />
      <BlockerMessage message={finalBlocker} />
    </>
  )

  return (
    <div
      className={cn(
        'h-full',
        layout === 'stack' && 'flex min-h-[30rem] flex-col',
        layout === 'split' && 'grid min-h-0 grid-cols-[20rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[22rem_minmax(0,1fr)]',
        layout === 'wide' && 'grid min-h-0 grid-cols-[24rem_minmax(0,1fr)_22rem] grid-rows-[minmax(0,1fr)]',
      )}
    >
      <h1 className="sr-only">Personaliza tu {product.name.toLowerCase()}</h1>

      {/* Lienzo */}
      <section aria-label="Lienzo de diseño" className={cn('flex flex-col bg-cream', layout === 'stack' ? 'shrink-0 border-b-2 border-ink' : 'order-2 min-h-0')}>
        <Toolbar onStartOver={() => setConfirmReset(true)} />
        <div
          data-editor-canvas
          tabIndex={0}
          role="group"
          aria-label={`Lienzo de ${product.name.toLowerCase()}, vista ${view.label.toLowerCase()}. Selecciona un elemento y usa las flechas para moverlo, Supr para eliminarlo.`}
          className={cn(
            'bg-dots-soft relative mx-3 mb-2 overflow-hidden rounded-3xl border-2 border-ink bg-white/60 outline-offset-2',
            // En una columna el lienzo cede altura al panel de herramientas en pantallas bajas (mínimo 9 rem).
            layout === 'stack' ? 'h-[max(9rem,min(44dvh,calc(100dvh-28.5rem),calc((100vw-1.5rem)*var(--ar))))] flex-none' : 'min-h-0 flex-1',
          )}
          style={{ ['--ar' as string]: view.viewBox.height / view.viewBox.width }}
        >
          <EditorCanvas images={images} />
          <EmptyCanvasHint />
          <CanvasNotices images={images} />
        </div>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </section>

      {/* Herramientas */}
      <aside aria-label="Herramientas" className={cn('flex min-h-0 flex-col bg-paper', layout === 'stack' ? 'flex-1' : 'order-1 border-r-2 border-ink')}>
        <TabBar
          tabs={tabs}
          value={activeTab}
          onChange={setTab}
          label="Herramientas del editor"
          idPrefix="ed"
          className="shrink-0 border-b-2 border-ink"
        />
        <div
          role="tabpanel"
          id={`ed-panel-${activeTab}`}
          aria-labelledby={`ed-tab-${activeTab}`}
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        >
          {activeTab === 'producto' && <ProductPanel />}
          {activeTab === 'subir' && <UploadPanel images={images} />}
          {activeTab === 'texto' && <TextPanel />}
          {activeTab === 'pegatinas' && <StickersPanel />}
          {activeTab === 'capas' && <LayersPanel images={images} />}
          {activeTab === 'resumen' && <SummaryPanel />}
        </div>
      </aside>

      {/* Resumen (escritorio) */}
      {wide && (
        <aside aria-label="Resumen del pedido" className="order-3 flex min-h-0 flex-col border-l-2 border-ink bg-paper">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <SummaryPanel />
          </div>
          <div className="shrink-0 border-t-2 border-ink bg-yellow-soft p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2" aria-live="polite">
              <span className="font-bold">Total <span className="text-sm font-semibold text-ink-soft">IVA incl.</span></span>
              <span className="font-display text-3xl font-semibold leading-none">{price.ok ? formatEUR(price.totalCents) : '—'}</span>
            </div>
            {addButton}
          </div>
        </aside>
      )}

      {/* Barra inferior (móvil) */}
      {!wide && (
        <div
          className={cn(
            'sticky bottom-0 z-10 shrink-0 border-t-2 border-ink bg-paper px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2',
            layout === 'split' && 'order-3 col-span-2',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1" aria-live="polite">
              {price.ok ? (
                <>
                  <p className="font-display text-2xl font-semibold leading-none">{formatEUR(price.totalCents)}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">IVA incl. · {unidades(qty)}</p>
                </>
              ) : (
                <p id={BLOCKER_ID} className="line-clamp-3 text-xs font-bold leading-snug text-pink-deep">{finalBlocker}</p>
              )}
            </div>
            <CartButton label={addLabel} blocked={!!finalBlocker} working={working} onClick={cart.run} block={false} size="md" />
          </div>
          {price.ok && finalBlocker && <BlockerMessage message={finalBlocker} />}
        </div>
      )}

      <CartDialog state={cart.state} onClose={cart.close} onRetry={cart.run} />
      <ConfirmStartOver open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={() => useEditor.getState().startOver()} />
    </div>
  )
}

