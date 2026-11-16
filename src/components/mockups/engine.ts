import { getProduct, getView, type ProductView } from '@/config/products'
import { normalizeHex, toneOf } from './color'
import { guidesMarkup } from './guides'
import { artInBox, mainArea } from './art'
import { capFront, capSide } from './cap'
import { hoodieBack, hoodieFront } from './hoodie'
import { mugIcon, mugWrap } from './mug'
import { tshirtBack, tshirtFront } from './tshirt'
import type { Built, Ctx, MockupOptions } from './types'

type Drawer = (ctx: Ctx) => Built

const DRAWERS: Record<string, Drawer> = {
  'camiseta/front': tshirtFront,
  'camiseta/back': tshirtBack,
  'hoodie/front': hoodieFront,
  'hoodie/back': hoodieBack,
  'gorra/front': capFront,
  'gorra/side': capSide,
  'taza/wrap': mugWrap,
}

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, '')

/** Construye el contenido interior del SVG y su tamaño; null si el producto o la vista no existen. */
export function buildMockup(opts: MockupOptions): Built | null {
  const product = getProduct(opts.productId)
  const view: ProductView | undefined = product && getView(product, opts.viewId)
  if (!product || !view) return null
  const draw = opts.icon && opts.productId === 'taza' ? mugIcon : DRAWERS[`${opts.productId}/${opts.viewId}`]
  if (!draw) return null
  const hex = normalizeHex(opts.colorHex)
  const uid = `mk-${slug(opts.productId)}-${slug(opts.viewId)}-${hex.slice(1)}${opts.art === undefined ? '' : `-a${opts.art}`}${opts.icon ? '-i' : ''}`
  const main = view.areas.length ? mainArea(view) : undefined
  const artIn: Ctx['artIn'] = (box, id) => (opts.art === undefined ? '' : artInBox(opts.art, uid, box, id))
  const art = (areaId: string) =>
    main && areaId === main.id
      ? artIn({ cx: main.center.x, cy: main.center.y, w: main.widthCm * view.pxPerCm, h: main.heightCm * view.pxPerCm }, areaId)
      : ''
  const ctx: Ctx = { uid, hex, tone: toneOf(hex), view, art, artIn }
  const built = draw(ctx)
  // la ilustración de catálogo de la taza no es la vista de la zona de estampado: no lleva guías
  const withGuides = opts.guides && draw !== mugIcon
  return withGuides ? { ...built, body: built.body + guidesMarkup(view) } : built
}

function svgFrom(built: Built): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${built.width} ${built.height}" width="${built.width}" height="${built.height}">${built.body}</svg>`
}

export function mockupSvg(opts: MockupOptions): string {
  const built = buildMockup(opts)
  return built ? svgFrom(built) : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="600" height="700"></svg>'
}

export function mockupDataUrl(opts: MockupOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mockupSvg(opts))}`
}
