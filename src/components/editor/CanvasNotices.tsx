'use client'
import { ImagePlus, Smile, Type } from 'lucide-react'
import { TriangleAlert } from 'lucide-react'
import { getArea, getProduct } from '@/config/products'
import { LOW_DPI } from '@/lib/editor/constants'
import { effectiveDpi, layerOutside, layerOverflows } from '@/lib/editor/geometry'
import { useEditor } from '@/lib/editor/store'
import { layerName } from './panels/LayersPanel'
import type { ImageMap } from './useImages'

/** Avisos sobre el lienzo: elementos fuera de la zona, resolución baja o imágenes que ya no existen. */
export function CanvasNotices({ images }: { images: ImageMap }) {
  const productId = useEditor((s) => s.productId)
  const areaId = useEditor((s) => s.areaId)
  const layers = useEditor((s) => s.design.areas[s.areaId]?.layers)
  const product = getProduct(productId)
  const area = product ? getArea(product, areaId) : undefined
  if (!area || !layers) return null

  const notices: string[] = []
  const outside = layers.filter((l) => layerOutside(l, area))
  const partly = layers.filter((l) => !layerOutside(l, area) && layerOverflows(l, area))
  if (outside.length) notices.push(`«${layerName(outside[0])}» está fuera de la zona y no se imprimirá.`)
  if (partly.length) notices.push(`«${layerName(partly[0])}» sobresale de la zona: solo se imprime la parte de dentro (la parte atenuada se queda fuera).`)
  for (const l of layers) {
    if (l.type !== 'image') continue
    const img = images[l.fileId]
    if (img === 'error') notices.push(`«${layerName(l)}» ya no está disponible. Elimínala y vuelve a subirla.`)
    else if (img && !img.vector) {
      const dpi = Math.round(effectiveDpi(l.naturalWidth, l.width))
      if (dpi < LOW_DPI) notices.push(`«${layerName(l)}»: resolución baja (${dpi} ppp), puede verse pixelado.`)
    }
  }
  if (!notices.length) return null

  return (
    <ul className="pointer-events-none absolute inset-x-2 bottom-2 grid gap-1" role="status" aria-label="Avisos del lienzo">
      {notices.slice(0, 2).map((n) => (
        <li key={n} className="flex items-start gap-1.5 rounded-xl border-2 border-ink bg-yellow-soft/95 px-2.5 py-1 text-xs font-bold leading-snug max-sm:[&:nth-child(n+2)]:hidden sm:text-sm">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {n}
        </li>
      ))}
    </ul>
  )
}

/** Mensaje de lienzo vacío con atajos a las herramientas. */
export function EmptyCanvasHint() {
  const empty = useEditor((s) => (s.design.areas[s.areaId]?.layers.length ?? 0) === 0)
  if (!empty) return null
  const go = (tab: 'subir' | 'texto' | 'pegatinas') => useEditor.getState().setTab(tab)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2">
      <div className="pointer-events-auto flex items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-paper/95 px-2 py-1.5 shadow-pop-sm">
        <span className="hidden text-sm font-bold sm:inline">Empieza por aquí:</span>
        <button type="button" onClick={() => go('subir')} className="btn btn-sm btn-secondary !min-h-10 !px-3"><ImagePlus aria-hidden="true" className="size-4" />Imagen</button>
        <button type="button" onClick={() => go('texto')} className="btn btn-sm btn-teal !min-h-10 !px-3"><Type aria-hidden="true" className="size-4" />Texto</button>
        <button type="button" onClick={() => go('pegatinas')} className="btn btn-sm !min-h-10 !px-3"><Smile aria-hidden="true" className="size-4" />Pegatinas</button>
      </div>
    </div>
  )
}
