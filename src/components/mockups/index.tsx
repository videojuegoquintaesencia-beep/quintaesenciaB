/**
 * Mockups SVG de producto.  (PLACEHOLDER mínimo: el agente de mockups lo sustituye por la
 * librería de ilustraciones real, manteniendo estas exportaciones.)
 *
 * Contrato:
 *  - mockupSvg({ productId, viewId, colorHex, guides? }) → string con un <svg> completo (viewBox de la vista).
 *      · Debe funcionar al convertirlo en <img src="data:image/svg+xml…"> y al pintarlo en un <canvas> (Konva):
 *        sin CSS externo, sin fuentes web, sin mix-blend-mode ni filtros que el canvas no soporte.
 *      · guides=true dibuja además el contorno de las zonas de estampado (para el editor).
 *  - mockupDataUrl(opts) → "data:image/svg+xml;charset=utf-8,…"
 *  - <ProductMockup productId viewId? colorId? className? /> → componente React (SVG en línea) para catálogo.
 *  - <ProductShowcase productId viewId? colorId? variant? className? /> → igual, pero con un diseño de ejemplo estampado.
 */
import { getColor, getProduct, getView, type ProductId } from '@/config/products'

export interface MockupOptions {
  productId: ProductId
  viewId: string
  colorHex: string
  guides?: boolean
}

export function mockupSvg({ productId, viewId, colorHex, guides }: MockupOptions): string {
  const product = getProduct(productId)
  const view = product ? getView(product, viewId) : undefined
  const { width, height } = view?.viewBox ?? { width: 600, height: 700 }
  const areas = (view?.areas ?? [])
    .map((a) => {
      const w = a.widthCm * (view?.pxPerCm ?? 8)
      const h = a.heightCm * (view?.pxPerCm ?? 8)
      return guides
        ? `<rect x="${a.center.x - w / 2}" y="${a.center.y - h / 2}" width="${w}" height="${h}" fill="none" stroke="#1b1340" stroke-width="2" stroke-dasharray="8 6"/>`
        : ''
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect x="${width * 0.1}" y="${height * 0.1}" width="${width * 0.8}" height="${height * 0.8}" rx="40" fill="${colorHex}" stroke="#1b1340" stroke-width="4"/>${areas}</svg>`
}

export function mockupDataUrl(opts: MockupOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mockupSvg(opts))}`
}

export interface ProductMockupProps {
  productId: ProductId
  viewId?: string
  colorId?: string
  className?: string
  /** Texto alternativo; por defecto describe el producto. */
  label?: string
}

export function ProductMockup({ productId, viewId, colorId, className, label }: ProductMockupProps) {
  const product = getProduct(productId)
  if (!product) return null
  const view = (viewId && getView(product, viewId)) || product.views[0]
  const color = (colorId && getColor(product, colorId)) || product.colors[0]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={mockupDataUrl({ productId, viewId: view.id, colorHex: color.hex })}
      alt={label ?? `${product.name} ${color.name.toLowerCase()}`}
      width={view.viewBox.width}
      height={view.viewBox.height}
    />
  )
}

export interface ProductShowcaseProps extends ProductMockupProps {
  /** Variante del diseño de ejemplo (0, 1, 2…). */
  variant?: number
}

export function ProductShowcase(props: ProductShowcaseProps) {
  return <ProductMockup {...props} />
}
