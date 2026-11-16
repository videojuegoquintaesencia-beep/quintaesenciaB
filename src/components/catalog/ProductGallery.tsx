'use client'
import { useState } from 'react'
import { Ruler } from 'lucide-react'
import { getView, type Product } from '@/config/products'
import { ProductMockup, ProductShowcase } from '@/components/mockups'
import { cn } from '@/lib/cn'
import { PRODUCT_ART, PRODUCT_TINT, sizeLabel } from './appearance'
import { useProductSelection } from './ProductSelection'

interface Slide {
  id: string
  label: string
  viewId: string
  /** Ilustración de catálogo (solo tazas): la taza real en lugar de la plantilla desplegada. */
  icon?: boolean
}

function slidesFor(product: Product): Slide[] {
  const views = product.views.map((v) => ({ id: v.id, label: v.label, viewId: v.id }))
  if (product.id !== 'taza') return views
  return [{ id: 'icon', label: 'Taza', viewId: views[0].viewId, icon: true }, ...views]
}

const btn = 'inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink px-4 font-display font-semibold transition-colors'

/** Galería del producto: ilustración con diseño de ejemplo, cambio de vista y zonas de estampado. */
export function ProductGallery() {
  const { product, color } = useProductSelection()
  const slides = slidesFor(product)
  const [slideId, setSlideId] = useState(slides[0].id)
  const [zones, setZones] = useState(false)

  const slide = slides.find((s) => s.id === slideId) ?? slides[0]
  const showZones = zones && !slide.icon
  const view = getView(product, slide.viewId)
  const className = 'h-full w-full'

  return (
    <div>
      <div className={cn('card relative aspect-square overflow-hidden', PRODUCT_TINT[product.id])}>
        <div aria-hidden="true" className="bg-dots-soft absolute inset-0" />
        <div className="absolute inset-5 sm:inset-9">
          {showZones ? (
            <ProductMockup productId={product.id} viewId={slide.viewId} colorId={color.id} guides className={className} />
          ) : (
            <ProductShowcase
              productId={product.id}
              viewId={slide.viewId}
              colorId={color.id}
              variant={slide.icon ? 'icon' : PRODUCT_ART[product.id]}
              art={PRODUCT_ART[product.id]}
              className={className}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {slides.length > 1 && (
          <div role="group" aria-label="Vista del producto" className="flex flex-wrap gap-2">
            {slides.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === slide.id}
                onClick={() => setSlideId(s.id)}
                className={cn(btn, s.id === slide.id ? 'bg-ink text-cream shadow-pop-sm' : 'bg-paper hover:bg-yellow-soft')}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {!slide.icon && (
          <button
            type="button"
            aria-pressed={zones}
            onClick={() => setZones((z) => !z)}
            className={cn(btn, zones ? 'bg-teal shadow-pop-sm' : 'bg-paper hover:bg-teal-soft')}
          >
            <Ruler aria-hidden="true" size={18} strokeWidth={2.4} />
            Ver zonas de estampado
          </button>
        )}
      </div>

      <div className="mt-3 text-sm text-ink-soft" aria-live="polite">
        {showZones && view ? (
          <ul className="grid gap-1">
            {view.areas.map((a) => (
              <li key={a.id}>
                <strong className="text-ink">{a.label}:</strong> hasta {sizeLabel(a.widthCm, a.heightCm)}
              </li>
            ))}
          </ul>
        ) : (
          <p>Diseño de ejemplo: el tuyo puede ser lo que quieras.</p>
        )}
      </div>
    </div>
  )
}
