import type { ProductId, ProductView } from '@/config/products'
import type { Tone } from './color'

export interface MockupOptions {
  productId: ProductId
  viewId: string
  /** Color de la prenda (en las tazas: color del interior y el asa). */
  colorHex: string
  /** Dibuja el contorno discontinuo de las zonas de estampado (para el editor). */
  guides?: boolean
  /** Índice del diseño de ejemplo a estampar (0 … SAMPLE_ART_VARIANTS − 1). Sin valor: sin diseño. */
  art?: number
  /** Ilustración de catálogo en lugar de la vista técnica (solo cambia las tazas). */
  icon?: boolean
  /** Sufijo para los ids internos cuando el mismo mockup se pinta varias veces en la página (ids únicos en el HTML). */
  idSuffix?: string
}

/** Resultado de dibujar un mockup: el contenido interior del <svg> y su tamaño. */
export interface Built {
  width: number
  height: number
  body: string
}

/** Contexto que reciben los dibujantes de cada producto. */
export interface Ctx {
  /** Prefijo único y determinista para ids de degradados y recortes. */
  uid: string
  hex: string
  tone: Tone
  view: ProductView
  /** Diseño de ejemplo de una zona, ya recortado a ella ('' si no hay). Se coloca bajo las sombras. */
  art: (areaId: string) => string
  /** Igual, pero en un rectángulo cualquiera del lienzo (centro y tamaño). */
  artIn: (box: { cx: number; cy: number; w: number; h: number }, id: string) => string
}
