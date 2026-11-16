/**
 * Mockups SVG de producto: ilustraciones planas "pop" de cada producto y vista del catálogo.
 *
 *  - mockupSvg({ productId, viewId, colorHex, guides? }) → string con un <svg> completo (viewBox de la vista).
 *      · Autocontenido: sin <style>, sin clases, sin filtros, sin fuentes ni referencias externas, así que
 *        se ve igual en línea, como <img src="data:…"> y pintado en un <canvas> (Konva).
 *      · guides=true dibuja además el contorno de las zonas de estampado (para el editor).
 *      · En las tazas, `colorHex` es el color del interior y el asa; el cuerpo es siempre blanco y la vista
 *        "wrap" es la plantilla desplegada.
 *  - mockupDataUrl(opts) → "data:image/svg+xml;charset=utf-8,…"
 *  - <ProductMockup productId viewId? colorId? className? label? variant? guides? /> → SVG en línea para catálogo.
 *  - <ProductShowcase … variant? art? /> → igual, con un diseño de ejemplo estampado en la zona principal.
 *      `variant` es el índice del diseño (0 … SAMPLE_ART_VARIANTS − 1) o "icon" para la ilustración de catálogo.
 *
 * Los ids internos (degradados, recortes) incluyen producto, vista, color y diseño: son deterministas y no chocan
 * al repetir mockups en la misma página.
 */
import { getColor, getProduct, getView, type ProductId } from '@/config/products'
import { SAMPLE_ART_VARIANTS } from './art'
import { buildMockup, mockupDataUrl, mockupSvg } from './engine'
import type { MockupOptions } from './types'

export { mockupDataUrl, mockupSvg, SAMPLE_ART_VARIANTS }
export type { MockupOptions }

export interface ProductMockupProps {
  productId: ProductId
  viewId?: string
  colorId?: string
  /** Se aplica al <svg>: p. ej. "h-auto w-full". */
  className?: string
  /** Texto alternativo; por defecto describe el producto. Con "" la ilustración es decorativa. */
  label?: string
  /** "icon": ilustración de catálogo (solo cambia las tazas; el resto usa la primera vista). */
  variant?: 'icon'
  /** Dibuja el contorno de las zonas de estampado. */
  guides?: boolean
}

export interface ProductShowcaseProps extends Omit<ProductMockupProps, 'variant'> {
  /** Índice del diseño de ejemplo (0, 1, 2…), o "icon" para la ilustración de catálogo. */
  variant?: number | 'icon'
  /** Diseño de ejemplo cuando `variant` es "icon". */
  art?: number
}

function render(props: ProductMockupProps, art: number | undefined) {
  const { productId, viewId, colorId, className, label, variant, guides } = props
  const product = getProduct(productId)
  if (!product) return null
  const icon = variant === 'icon'
  const explicitView = !icon && viewId ? getView(product, viewId) : undefined
  const view = explicitView ?? product.views[0]
  const color = (colorId && getColor(product, colorId)) || product.colors[0]
  const built = buildMockup({ productId, viewId: view.id, colorHex: color.hex, guides, art, icon })
  if (!built) return null

  const colorText = productId === 'taza' ? ` ${color.name.toLowerCase()}` : `, color ${color.name.toLowerCase()}`
  const alt =
    label ??
    `${product.name}${colorText}${explicitView ? `, vista ${view.label.toLowerCase()}` : ''}${art === undefined ? '' : ', con un diseño de ejemplo'}`
  const a11y = alt ? ({ role: 'img', 'aria-label': alt } as const) : ({ 'aria-hidden': true } as const)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${built.width} ${built.height}`}
      className={className}
      focusable="false"
      {...a11y}
      dangerouslySetInnerHTML={{ __html: built.body }}
    />
  )
}

export function ProductMockup(props: ProductMockupProps) {
  return render(props, undefined)
}

export function ProductShowcase({ variant, art, ...rest }: ProductShowcaseProps) {
  const design = typeof variant === 'number' ? variant : (art ?? 0)
  return render({ ...rest, variant: variant === 'icon' ? 'icon' : undefined }, design)
}
