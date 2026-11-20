import type { PrintArea, ProductView } from '@/config/products'

export interface ViewCrop {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Recorte de la vista del producto para las miniaturas de plantillas: la zona de estampado con un margen
 * de prenda alrededor (para ver el color y el contexto) sin salirse del viewBox. Con la vista completa el
 * diseño quedaría demasiado pequeño para distinguirlo.
 */
export function thumbnailCrop(view: ProductView, area: PrintArea): ViewCrop {
  const w = area.widthCm * view.pxPerCm
  const h = area.heightCm * view.pxPerCm
  const padX = w * 0.3
  const padY = h * 0.22
  const x0 = Math.max(0, area.center.x - w / 2 - padX)
  const x1 = Math.min(view.viewBox.width, area.center.x + w / 2 + padX)
  const y0 = Math.max(0, area.center.y - h / 2 - padY)
  const y1 = Math.min(view.viewBox.height, area.center.y + h / 2 + padY)
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}
