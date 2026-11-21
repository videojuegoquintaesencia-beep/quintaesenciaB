'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
// Tipografías de las plantillas destacadas (solo el subconjunto latino): así la miniatura se ve con la letra real.
import '@fontsource/anton/latin-400.css'
import '@fontsource/bangers/latin-400.css'
import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/pacifico/latin-400.css'
import { TemplateSvgThumb } from '@/components/templates/TemplateSvgThumb'
import { cn } from '@/lib/cn'
import { featuredTemplates, occasionLabel, templatesFor } from '@/lib/templates'
import { PRODUCT_TINT } from './appearance'
import { useProductSelection } from './ProductSelection'

/** Plantillas destacadas de la ficha: cada tarjeta abre el personalizador con la plantilla ya puesta y el color elegido. */
export function TemplateIdeas() {
  const { product, color } = useProductSelection()
  const featured = featuredTemplates(product.id)
  const total = templatesFor(product.id).length

  return (
    <div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((t) => (
          <li key={t.id}>
            <Link
              href={`/personalizar/${product.id}?plantilla=${t.id}&color=${color.id}`}
              className="card card-hover group flex h-full flex-col overflow-hidden focus-visible:outline-offset-[-6px]"
            >
              <span className={cn('grid place-items-center border-b-2 border-ink p-4', PRODUCT_TINT[product.id])}>
                <TemplateSvgThumb template={t} product={product} colorId={color.id} label="" className="h-40 w-full" />
              </span>
              <span className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
                <span className="chip self-start !text-xs">{occasionLabel(t.occasion)}</span>
                <span className="font-display text-xl font-semibold leading-tight">{t.name}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-bold text-violet-deep">
                  Usar esta plantilla
                  <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-2xl text-ink-soft">
        En el personalizador hay {total} plantillas para {product.namePlural.toLowerCase()}, agrupadas por ocasión. Todas se editan como un diseño
        propio: cambia el texto de ejemplo, los colores, la tipografía y el tamaño.
      </p>
    </div>
  )
}
