'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { getArea, getProduct, getView, type Product } from '@/config/products'
import { TemplateSvgThumb } from '@/components/templates/TemplateSvgThumb'
import { thumbnailCrop } from '@/components/templates/thumb-crop'
import { cn } from '@/lib/cn'
import { useTemplateFlow } from '@/lib/editor/apply-template'
import { useEditor } from '@/lib/editor/store'
import { templateThumbnail } from '@/lib/editor/template-thumbs'
import { TEMPLATE_OCCASIONS, occasionLabel, templatesFor, type Template, type TemplateOccasion } from '@/lib/templates'
import { Group, PanelTitle } from '../ui'

type Filter = TemplateOccasion | 'todas'

export function TemplatesPanel() {
  const productId = useEditor((s) => s.productId)
  const colorId = useEditor((s) => s.design.colorId)
  const viewId = useEditor((s) => s.viewId)
  const areaId = useEditor((s) => s.areaId)
  const [filter, setFilter] = useState<Filter>('todas')
  const product = getProduct(productId)
  const area = product ? getArea(product, areaId) : undefined
  if (!product || !area) return null

  const all = templatesFor(productId)
  const occasions = TEMPLATE_OCCASIONS.filter((o) => all.some((t) => t.occasion === o.id))
  const shown = filter === 'todas' ? all : all.filter((t) => t.occasion === filter)

  return (
    <div>
      <PanelTitle hint={`Diseños listos para la zona «${area.label}». Después cambia textos, colores, tamaño y posición a tu gusto.`}>
        Plantillas
      </PanelTitle>

      <Group title="Ocasión">
        <div role="group" aria-label="Filtrar plantillas por ocasión" className="flex flex-wrap gap-2">
          <Chip on={filter === 'todas'} onClick={() => setFilter('todas')}>
            Todas
          </Chip>
          {occasions.map((o) => (
            <Chip key={o.id} on={filter === o.id} onClick={() => setFilter(o.id)}>
              {o.label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
          {shown.length === 1 ? '1 plantilla' : `${shown.length} plantillas`}
          {filter !== 'todas' ? ` de ${occasionLabel(filter).toLowerCase()}` : ''}
        </p>
      </Group>

      <ul className="grid grid-cols-2 gap-3" aria-label="Plantillas disponibles">
        {shown.map((t) => (
          <TemplateCard key={t.id} template={t} product={product} colorId={colorId} viewId={viewId} areaId={areaId} />
        ))}
      </ul>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center rounded-full border-2 border-ink px-3.5 text-sm font-extrabold transition-colors',
        on ? 'bg-yellow shadow-pop-sm' : 'bg-paper hover:bg-yellow-soft',
      )}
    >
      {children}
    </button>
  )
}

/** true desde la primera vez que el elemento se acerca a la pantalla (y ya no vuelve a false). */
function useNearViewport(ref: RefObject<Element | null>): boolean {
  // Sin IntersectionObserver (navegadores muy antiguos) se dibuja todo desde el principio.
  const [near, setNear] = useState(() => !('IntersectionObserver' in window))
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true)
      },
      { rootMargin: '160px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, near])
  return near
}

type ThumbState = { key: string; src: string } | { key: string; src: 'error' } | null

function TemplateCard({ template, product, colorId, viewId, areaId }: { template: Template; product: Product; colorId: string; viewId: string; areaId: string }) {
  const ref = useRef<HTMLLIElement>(null)
  const near = useNearViewport(ref)
  const [thumb, setThumb] = useState<ThumbState>(null)
  const key = [template.id, product.id, colorId, viewId, areaId].join('|')

  // La miniatura se dibuja solo cuando la tarjeta se acerca a la pantalla, y se vuelve a dibujar si cambia
  // el color, la vista o la zona. Mientras llega la nueva se conserva la anterior para no parpadear.
  useEffect(() => {
    if (!near) return
    const view = getView(product, viewId)
    const area = getArea(product, areaId)
    if (!view || !area) return
    let cancelled = false
    templateThumbnail(template, product, colorId, view, area)
      .then((src) => !cancelled && setThumb({ key, src }))
      .catch(() => !cancelled && setThumb({ key, src: 'error' }))
    return () => {
      cancelled = true
    }
  }, [near, key, template, product, colorId, viewId, areaId])

  const view = getView(product, viewId) ?? product.views[0]
  const area = getArea(product, areaId)
  const crop = thumbnailCrop(view, area ?? view.areas[0])
  const loading = near && thumb?.key !== key
  const occasion = occasionLabel(template.occasion)

  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={() => useTemplateFlow.getState().request(template)}
        aria-label={`Aplicar la plantilla «${template.name}» (${occasion.toLowerCase()})`}
        aria-busy={loading || undefined}
        className="group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-ink bg-paper text-left transition-transform hover:-translate-y-0.5 hover:shadow-pop-sm"
      >
        <span className="bg-dots-soft relative block w-full border-b-2 border-ink bg-cream" style={{ aspectRatio: `${crop.width} / ${crop.height}` }}>
          {thumb?.src === 'error' && area ? (
            // Si el dibujo con Konva falla, la miniatura en SVG puro enseña la misma composición.
            <TemplateSvgThumb template={template} product={product} colorId={colorId} view={view} area={area} label="" className="absolute inset-0 size-full" />
          ) : thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb.src} alt="" className={cn('absolute inset-0 size-full object-contain transition-opacity', loading && 'opacity-60')} />
          ) : (
            <span aria-hidden="true" className={cn('absolute inset-0 bg-ink/5', loading && 'animate-pulse')} />
          )}
        </span>
        <span className="block min-w-0 px-2.5 py-2">
          <span className="line-clamp-2 text-sm font-extrabold leading-tight">{template.name}</span>
          <span className="block truncate text-xs text-ink-soft">{occasion}</span>
        </span>
      </button>
    </li>
  )
}
