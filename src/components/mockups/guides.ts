import { INK } from './color'
import { n } from './svg'
import type { ProductView } from '@/config/products'

/** Contorno discontinuo de cada zona de estampado; legible sobre prendas claras y oscuras. */
export function guidesMarkup(view: ProductView): string {
  return view.areas
    .map((a) => {
      const w = a.widthCm * view.pxPerCm
      const h = a.heightCm * view.pxPerCm
      const r = `x="${n(a.center.x - w / 2)}" y="${n(a.center.y - h / 2)}" width="${n(w)}" height="${n(h)}" rx="4" fill="none"`
      return `<rect ${r} stroke="#fff" stroke-opacity=".7" stroke-width="3.5"/><rect ${r} stroke="${INK}" stroke-opacity=".75" stroke-width="1.6" stroke-dasharray="7 5"/>`
    })
    .join('')
}
