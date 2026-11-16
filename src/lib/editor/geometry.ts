import type { PrintArea } from '@/config/products'
import { layerBounds, type Layer } from '@/lib/design'
import { SNAP_TOLERANCE_CM } from './constants'

export const CM_PER_INCH = 2.54

export const round1 = (n: number) => Math.round(n * 10) / 10
export const round2 = (n: number) => Math.round(n * 100) / 100
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Esquina superior izquierda de una zona en unidades del viewBox. */
export function areaOrigin(area: PrintArea, pxPerCm: number): { x: number; y: number } {
  return { x: area.center.x - (area.widthCm * pxPerCm) / 2, y: area.center.y - (area.heightCm * pxPerCm) / 2 }
}

export interface SnapResult {
  x: number
  y: number
  /** Posiciones (cm) de las líneas guía activas. */
  guideX: number[]
  guideY: number[]
}

/** Imán del centro de una capa a los ejes y bordes de la zona de estampado. */
export function snapToArea(
  layer: Pick<Layer, 'x' | 'y' | 'width' | 'height' | 'rotation'>,
  area: Pick<PrintArea, 'widthCm' | 'heightCm'>,
  tolerance = SNAP_TOLERANCE_CM,
): SnapResult {
  const b = layerBounds(layer)
  const best = (edges: [number, number][]) => {
    let pick: { shift: number; line: number } | null = null
    for (const [pos, line] of edges) {
      const shift = line - pos
      if (Math.abs(shift) <= tolerance && (!pick || Math.abs(shift) < Math.abs(pick.shift))) pick = { shift, line }
    }
    return pick
  }
  const sx = best([
    [b.x0, 0],
    [(b.x0 + b.x1) / 2, area.widthCm / 2],
    [b.x1, area.widthCm],
  ])
  const sy = best([
    [b.y0, 0],
    [(b.y0 + b.y1) / 2, area.heightCm / 2],
    [b.y1, area.heightCm],
  ])
  return {
    x: layer.x + (sx?.shift ?? 0),
    y: layer.y + (sy?.shift ?? 0),
    guideX: sx ? [sx.line] : [],
    guideY: sy ? [sy.line] : [],
  }
}

/** Tamaño (cm) de una imagen para que ocupe `fraction` de la zona sin deformarse. */
export function fitSize(naturalW: number, naturalH: number, area: Pick<PrintArea, 'widthCm' | 'heightCm'>, fraction = 0.7) {
  const scale = Math.min((area.widthCm * fraction) / naturalW, (area.heightCm * fraction) / naturalH)
  return { width: round2(naturalW * scale), height: round2(naturalH * scale) }
}

/** ¿Alguna parte de la capa queda fuera de la zona imprimible? */
export function layerOverflows(layer: Layer, area: Pick<PrintArea, 'widthCm' | 'heightCm'>): boolean {
  const b = layerBounds(layer)
  const eps = 0.05
  return b.x0 < -eps || b.y0 < -eps || b.x1 > area.widthCm + eps || b.y1 > area.heightCm + eps
}

/** ¿La capa está completamente fuera de la zona (no se imprimirá nada)? */
export function layerOutside(layer: Layer, area: Pick<PrintArea, 'widthCm' | 'heightCm'>): boolean {
  const b = layerBounds(layer)
  return b.x1 <= 0 || b.y1 <= 0 || b.x0 >= area.widthCm || b.y0 >= area.heightCm
}

/** Resolución efectiva en ppp de una imagen colocada con el ancho dado. */
export function effectiveDpi(naturalWidth: number, widthCm: number): number {
  return naturalWidth / (widthCm / CM_PER_INCH)
}
